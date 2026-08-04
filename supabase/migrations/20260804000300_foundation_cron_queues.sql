create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pgmq;

create table app_private.scheduler_heartbeats (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now()
);

create or replace function app_private.record_scheduler_heartbeat()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from app_private.scheduler_heartbeats
   where ran_at < now() - interval '1 day';
  insert into app_private.scheduler_heartbeats default values;
end;
$$;

select cron.schedule(
  'imokay-foundation-heartbeat',
  '*/5 * * * *',
  'select app_private.record_scheduler_heartbeat()'
);

do $$
begin
  if not exists (
    select 1
    from pgmq.list_queues()
    where queue_name = 'notification_jobs'
  ) then
    perform pgmq.create('notification_jobs');
  end if;
end;
$$;

revoke all on schema cron from public, anon, authenticated;
revoke all on schema pgmq from public, anon, authenticated;
revoke all on all tables in schema cron from public, anon, authenticated;
revoke all on all tables in schema pgmq from public, anon, authenticated;
revoke all on all functions in schema pgmq from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
