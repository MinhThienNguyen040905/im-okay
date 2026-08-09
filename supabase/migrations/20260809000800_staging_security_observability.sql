-- S4 staging hardening: distributed rate limits, hosted worker scheduling and
-- privacy-safe operational signals. Runtime secrets stay in Edge secrets/Vault.

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create table app_private.rate_limit_buckets (
  scope text not null check (scope ~ '^[a-z0-9:_-]{1,100}$'),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null,
  primary key (scope, subject_hash)
);

create index rate_limit_buckets_updated_idx
  on app_private.rate_limit_buckets (updated_at);

create or replace function app_private.enforce_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz;
  bucket_count integer;
  retry_at timestamptz;
begin
  if p_scope is null or p_scope !~ '^[a-z0-9:_-]{1,100}$'
    or p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 10000
    or p_window_seconds < 1 or p_window_seconds > 86400
  then
    raise exception using errcode = 'P0001', message = 'INVALID_RATE_LIMIT_POLICY';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds
  );
  retry_at := bucket_start + make_interval(secs => p_window_seconds);

  insert into app_private.rate_limit_buckets (
    scope, subject_hash, window_started_at, request_count, updated_at
  ) values (p_scope, p_subject_hash, bucket_start, 1, p_now)
  on conflict (scope, subject_hash) do update
  set window_started_at = case
        when app_private.rate_limit_buckets.window_started_at = excluded.window_started_at
          then app_private.rate_limit_buckets.window_started_at
        else excluded.window_started_at
      end,
      request_count = case
        when app_private.rate_limit_buckets.window_started_at = excluded.window_started_at
          then app_private.rate_limit_buckets.request_count + 1
        else 1
      end,
      updated_at = excluded.updated_at
  returning request_count into bucket_count;

  return jsonb_build_object(
    'allowed', bucket_count <= p_limit,
    'limit', p_limit,
    'remaining', greatest(p_limit - bucket_count, 0),
    'retryAt', retry_at
  );
end;
$$;

create or replace function app_private.cleanup_rate_limit_buckets(
  p_now timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from app_private.rate_limit_buckets
  where updated_at < p_now - interval '2 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function app_private.invoke_edge_worker(
  p_function_name text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  publishable_key text;
  internal_secret text;
  request_id bigint;
begin
  if p_function_name not in ('notification-consumer', 'provider-receipts') then
    raise exception using errcode = 'P0001', message = 'INVALID_EDGE_WORKER';
  end if;

  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'imokay_staging_project_url' limit 1;
  select decrypted_secret into publishable_key
  from vault.decrypted_secrets where name = 'imokay_staging_publishable_key' limit 1;
  select decrypted_secret into internal_secret
  from vault.decrypted_secrets where name = 'imokay_internal_function_secret' limit 1;

  -- Local/CI and an unconfigured staging project deliberately do not call the network.
  if project_url is null or publishable_key is null or internal_secret is null then
    return null;
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'apikey', publishable_key,
      'content-type', 'application/json',
      'x-internal-function-secret', internal_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$$;

create or replace function app_private.operational_snapshot(
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_heartbeat timestamptz;
  queue_depth integer;
  queue_oldest_age_seconds integer;
  due_pending integer;
  queued_intents integer;
  overdue_untriggered integer;
  outbox_pending integer;
  outbox_failed integer;
  deliveries_queued integer;
  deliveries_unknown integer;
  deliveries_dead_letter integer;
  receipt_backlog integer;
  oldest_delivery_age_seconds integer;
  cron_failures integer;
begin
  select max(ran_at) into last_heartbeat from app_private.scheduler_heartbeats;

  select count(*)::integer,
    coalesce(max(greatest(0, extract(epoch from p_now - enqueued_at)))::integer, 0)
  into queue_depth, queue_oldest_age_seconds
  from pgmq.q_notification_jobs;

  select count(*) filter (where status = 'pending' and due_at <= p_now)::integer,
    count(*) filter (where status = 'queued')::integer
  into due_pending, queued_intents
  from public.scheduling_intents;

  select count(*)::integer into overdue_untriggered
  from public.alerts as alert
  join public.safety_plans as plan on plan.id = alert.safety_plan_id
  where plan.state <> 'inactive'
    and alert.deadline_at <= p_now
    and alert.state in ('scheduled', 'warning', 'triggering');

  select count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'failed')::integer
  into outbox_pending, outbox_failed from public.outbox_events;

  select
    count(*) filter (where status = 'queued' and not terminal)::integer,
    count(*) filter (where status = 'unknown' and not terminal)::integer,
    count(*) filter (where status = 'failed' and terminal)::integer,
    count(*) filter (
      where channel = 'push' and status = 'sent' and receipt_checked_at is null
        and receipt_due_at <= p_now
    )::integer,
    coalesce(max(greatest(0, extract(epoch from p_now - created_at))) filter (
      where status in ('queued', 'unknown') and not terminal
    )::integer, 0)
  into deliveries_queued, deliveries_unknown, deliveries_dead_letter,
    receipt_backlog, oldest_delivery_age_seconds
  from public.notification_deliveries;

  select count(*)::integer into cron_failures
  from cron.job_run_details as run
  join cron.job as job on job.jobid = run.jobid
  where job.jobname in (
      'imokay-core-scheduler',
      'imokay-notification-consumer',
      'imokay-provider-receipts'
    )
    and run.start_time >= p_now - interval '1 hour'
    and run.status <> 'succeeded';

  return jsonb_build_object(
    'serverTime', p_now,
    'scheduler', jsonb_build_object(
      'lastHeartbeatAt', last_heartbeat,
      'heartbeatAgeSeconds', case when last_heartbeat is null then null
        else greatest(0, extract(epoch from p_now - last_heartbeat))::integer end,
      'cronFailuresLastHour', cron_failures
    ),
    'queue', jsonb_build_object(
      'depth', queue_depth,
      'oldestAgeSeconds', queue_oldest_age_seconds
    ),
    'scheduling', jsonb_build_object(
      'duePending', due_pending,
      'queued', queued_intents,
      'overdueUntriggered', overdue_untriggered
    ),
    'outbox', jsonb_build_object('pending', outbox_pending, 'failed', outbox_failed),
    'deliveries', jsonb_build_object(
      'queued', deliveries_queued,
      'unknown', deliveries_unknown,
      'deadLetter', deliveries_dead_letter,
      'receiptBacklog', receipt_backlog,
      'oldestActionableAgeSeconds', oldest_delivery_age_seconds
    )
  );
end;
$$;

create or replace function public.internal_enforce_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.enforce_rate_limit(
    p_scope, p_subject_hash, p_limit, p_window_seconds, clock_timestamp()
  )
$$;

create or replace function public.internal_get_operational_snapshot()
returns jsonb
language sql
security definer
set search_path = ''
as $$ select app_private.operational_snapshot(clock_timestamp()) $$;

revoke all on table app_private.rate_limit_buckets from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.internal_enforce_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
revoke all on function public.internal_get_operational_snapshot()
  from public, anon, authenticated;
grant execute on function public.internal_enforce_rate_limit(text,text,integer,integer)
  to service_role;
grant execute on function public.internal_get_operational_snapshot() to service_role;

do $migration$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job
  where jobname = 'imokay-notification-consumer';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;

  select jobid into existing_job_id from cron.job
  where jobname = 'imokay-provider-receipts';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;

  select jobid into existing_job_id from cron.job
  where jobname = 'imokay-rate-limit-cleanup';
  if existing_job_id is not null then perform cron.unschedule(existing_job_id); end if;

  perform cron.schedule(
    'imokay-notification-consumer', '* * * * *',
    $$select app_private.invoke_edge_worker('notification-consumer')$$
  );
  perform cron.schedule(
    'imokay-provider-receipts', '*/5 * * * *',
    $$select app_private.invoke_edge_worker('provider-receipts')$$
  );
  perform cron.schedule(
    'imokay-rate-limit-cleanup', '17 3 * * *',
    $$select app_private.cleanup_rate_limit_buckets(clock_timestamp())$$
  );
end;
$migration$;
