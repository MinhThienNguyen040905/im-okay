-- Event-scoped location sharing. No background collection and no direct client table access.

create table public.location_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  safety_plan_id uuid not null references public.safety_plans(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  check_in_id uuid unique references public.check_ins(id) on delete cascade,
  source text not null check (source in ('sos', 'check_in')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision not null check (accuracy_meters > 0 and accuracy_meters <= 50000),
  captured_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > captured_at),
  created_at timestamptz not null default clock_timestamp(),
  unique (alert_id, source)
);

create index location_shares_active_alert_idx
  on public.location_shares (alert_id, expires_at desc);

alter table public.location_shares enable row level security;
alter table public.location_shares force row level security;
revoke all on table public.location_shares from public, anon, authenticated;

create or replace function app_private.assert_location_input(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_latitude is null and p_longitude is null and p_accuracy_meters is null then return; end if;
  if p_latitude is null or p_longitude is null or p_accuracy_meters is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180
     or p_accuracy_meters <= 0 or p_accuracy_meters > 50000 then
    raise exception using errcode = 'P0001', message = 'INVALID_LOCATION';
  end if;
end;
$$;

create or replace function app_private.perform_check_in_with_location(
  p_user_id uuid,
  p_idempotency_key text,
  p_source text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_check_in public.check_ins;
  existing_share public.location_shares;
  created_check_in public.check_ins;
  target_alert public.alerts;
  result jsonb;
begin
  perform app_private.assert_location_input(p_latitude, p_longitude, p_accuracy_meters);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0));

  select * into existing_check_in from public.check_ins
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if existing_check_in.id is not null then
    select * into existing_share from public.location_shares where check_in_id = existing_check_in.id;
    if (p_latitude is null) <> (existing_share.id is null)
       or (p_latitude is not null and (
         existing_share.latitude <> p_latitude
         or existing_share.longitude <> p_longitude
         or existing_share.accuracy_meters <> p_accuracy_meters
       )) then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return app_private.perform_check_in(p_user_id, p_idempotency_key, p_source, p_now, p_correlation_id);
  end if;

  result := app_private.perform_check_in(p_user_id, p_idempotency_key, p_source, p_now, p_correlation_id);
  if p_latitude is null then return result; end if;

  select * into created_check_in from public.check_ins
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  select * into target_alert from public.alerts
  where safety_plan_id = created_check_in.safety_plan_id
    and source = 'deadline' and state = 'scheduled'
  order by created_at desc limit 1;
  if target_alert.id is null then
    raise exception using errcode = 'P0001', message = 'LOCATION_TARGET_NOT_FOUND';
  end if;

  insert into public.location_shares (
    user_id, safety_plan_id, alert_id, check_in_id, source,
    latitude, longitude, accuracy_meters, captured_at, expires_at
  ) values (
    p_user_id, created_check_in.safety_plan_id, target_alert.id, created_check_in.id, 'check_in',
    p_latitude, p_longitude, p_accuracy_meters, p_now, target_alert.deadline_at + interval '24 hours'
  );
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id, correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'location.check_in_shared', 'check_in', created_check_in.id,
    p_correlation_id, jsonb_build_object('accuracyMeters', p_accuracy_meters, 'expiresAt', target_alert.deadline_at + interval '24 hours')
  );
  return result;
end;
$$;

create or replace function app_private.start_immediate_alert_with_location(
  p_user_id uuid,
  p_source text,
  p_idempotency_key text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt public.command_receipts;
  existing_share public.location_shares;
  alert_id uuid;
  result jsonb;
begin
  perform app_private.assert_location_input(p_latitude, p_longitude, p_accuracy_meters);
  if p_source <> 'sos' and p_latitude is not null then
    raise exception using errcode = 'P0001', message = 'LOCATION_NOT_ALLOWED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':alert:' || p_source || ':' || p_idempotency_key, 0));

  select * into receipt from public.command_receipts
  where user_id = p_user_id and scope = 'alert:' || p_source and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    alert_id := nullif(receipt.response_snapshot #>> '{projection,currentAlert,id}', '')::uuid;
    select * into existing_share from public.location_shares where alert_id = alert_id and source = 'sos';
    if (p_latitude is null) <> (existing_share.id is null)
       or (p_latitude is not null and (
         existing_share.latitude <> p_latitude
         or existing_share.longitude <> p_longitude
         or existing_share.accuracy_meters <> p_accuracy_meters
       )) then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return receipt.response_snapshot;
  end if;

  result := app_private.start_immediate_alert(p_user_id, p_source, p_idempotency_key, p_now, p_correlation_id);
  if p_latitude is null then return result; end if;
  alert_id := nullif(result #>> '{projection,currentAlert,id}', '')::uuid;
  if alert_id is null then raise exception using errcode = 'P0001', message = 'LOCATION_TARGET_NOT_FOUND'; end if;
  insert into public.location_shares (
    user_id, safety_plan_id, alert_id, source, latitude, longitude, accuracy_meters, captured_at, expires_at
  )
  select p_user_id, alert.safety_plan_id, alert.id, 'sos', p_latitude, p_longitude,
    p_accuracy_meters, p_now, p_now + interval '24 hours'
  from public.alerts as alert where alert.id = alert_id;
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id, correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'location.sos_shared', 'alert', alert_id,
    p_correlation_id, jsonb_build_object('accuracyMeters', p_accuracy_meters, 'expiresAt', p_now + interval '24 hours')
  );
  return result;
end;
$$;

create or replace function app_private.public_alert_projection_with_location(
  p_token text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  result jsonb := app_private.public_alert_projection(p_token, p_now);
  step public.alert_steps;
  share public.location_shares;
begin
  if result ->> 'status' <> 'active' then return result; end if;
  select * into step from public.alert_steps where response_token_hash = app_private.token_digest(p_token);
  if step.id is null then return result; end if;
  select * into share from public.location_shares
  where alert_id = step.alert_id and expires_at > p_now
  order by captured_at desc limit 1;
  if share.id is null then return result; end if;
  return result || jsonb_build_object('location', jsonb_build_object(
    'accuracyMeters', share.accuracy_meters,
    'capturedAt', share.captured_at,
    'latitude', share.latitude,
    'longitude', share.longitude,
    'source', share.source
  ));
end;
$$;

create or replace function public.internal_perform_check_in(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_correlation_id uuid
)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.perform_check_in_with_location(
  p_actor_user_id, p_idempotency_key, p_source, p_latitude, p_longitude, p_accuracy_meters,
  clock_timestamp(), p_correlation_id
) $$;

create or replace function public.internal_start_alert(
  p_actor_user_id uuid,
  p_source text,
  p_idempotency_key text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_correlation_id uuid
)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.start_immediate_alert_with_location(
  p_actor_user_id, p_source, p_idempotency_key, p_latitude, p_longitude, p_accuracy_meters,
  clock_timestamp(), p_correlation_id
) $$;

create or replace function public.internal_get_public_alert(p_token text)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.public_alert_projection_with_location(p_token, clock_timestamp()) $$;

create or replace function public.internal_consume_public_alert(
  p_token text, p_action text, p_idempotency_key text, p_correlation_id uuid
)
returns jsonb language plpgsql security definer set search_path = ''
as $$ begin
  perform app_private.consume_alert_response(p_token, p_action, p_idempotency_key, clock_timestamp(), p_correlation_id);
  return app_private.public_alert_projection_with_location(p_token, clock_timestamp());
end $$;

revoke all on function public.internal_perform_check_in(uuid, text, text, double precision, double precision, double precision, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_start_alert(uuid, text, text, double precision, double precision, double precision, uuid)
  from public, anon, authenticated;
grant execute on function public.internal_perform_check_in(uuid, text, text, double precision, double precision, double precision, uuid)
  to service_role;
grant execute on function public.internal_start_alert(uuid, text, text, double precision, double precision, double precision, uuid)
  to service_role;
