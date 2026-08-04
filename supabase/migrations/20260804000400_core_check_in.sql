create or replace function app_private.is_valid_iana_timezone(value text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = value
  );
$$;

alter table public.profiles
  add constraint profiles_timezone_iana_check
  check (app_private.is_valid_iana_timezone(timezone)) not valid;

update public.profiles
set timezone = 'UTC'
where not app_private.is_valid_iana_timezone(timezone);

alter table public.profiles
  validate constraint profiles_timezone_iana_check;

create unique index user_devices_push_token_key
  on public.user_devices (expo_push_token);

alter table public.check_ins
  add column response_snapshot jsonb;

alter table public.alerts
  add column deadline_at timestamptz,
  add column cycle_resource_version bigint,
  add column policy_version integer;

update public.alerts as alert
set deadline_at = plan.next_deadline_at,
    cycle_resource_version = plan.resource_version,
    policy_version = plan.policy_version
from public.safety_plans as plan
where plan.id = alert.safety_plan_id;

alter table public.alerts
  alter column deadline_at set not null,
  alter column cycle_resource_version set not null,
  alter column policy_version set not null,
  add constraint alerts_cycle_resource_version_check
    check (cycle_resource_version > 0),
  add constraint alerts_policy_version_check
    check (policy_version > 0);

alter table public.scheduling_intents
  add column alert_id uuid references public.alerts (id) on delete restrict;

update public.scheduling_intents as intent
set alert_id = alert.id
from public.alerts as alert
where alert.safety_plan_id = intent.safety_plan_id
  and alert.cycle_resource_version = intent.resource_version
  and alert.policy_version = intent.policy_version;

alter table public.scheduling_intents
  alter column alert_id set not null;

alter table public.outbox_events
  add column queue_message_id bigint;

create table app_private.check_in_policy_steps (
  policy_version integer not null check (policy_version > 0),
  interval_hours smallint not null check (interval_hours in (24, 36, 48)),
  step_key text not null check (char_length(step_key) between 1 and 100),
  kind text not null check (kind in ('warning', 'deadline', 'escalation')),
  due_offset interval not null check (due_offset >= interval '0 seconds'),
  primary key (policy_version, interval_hours, step_key),
  unique (policy_version, interval_hours, due_offset)
);

insert into app_private.check_in_policy_steps (
  policy_version,
  interval_hours,
  step_key,
  kind,
  due_offset
)
select
  1,
  interval_hours,
  step_key,
  kind,
  make_interval(hours => due_hour)
from (
  values
    (24::smallint, 'gentle-warning', 'warning', 12),
    (24::smallint, 'urgent-warning', 'warning', 20),
    (24::smallint, 'final-warning', 'warning', 23),
    (24::smallint, 'deadline', 'deadline', 24),
    (24::smallint, 'escalation', 'escalation', 26),
    (36::smallint, 'gentle-warning', 'warning', 24),
    (36::smallint, 'urgent-warning', 'warning', 32),
    (36::smallint, 'final-warning', 'warning', 35),
    (36::smallint, 'deadline', 'deadline', 36),
    (36::smallint, 'escalation', 'escalation', 38),
    (48::smallint, 'gentle-warning', 'warning', 36),
    (48::smallint, 'urgent-warning', 'warning', 44),
    (48::smallint, 'final-warning', 'warning', 47),
    (48::smallint, 'deadline', 'deadline', 48),
    (48::smallint, 'escalation', 'escalation', 50)
) as policy(interval_hours, step_key, kind, due_hour);

create or replace function app_private.assert_active_account(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.profiles;
begin
  if p_user_id is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  select *
  into profile
  from public.profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
  if profile.account_state <> 'active' then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_DISABLED';
  end if;
  return profile;
end;
$$;

create or replace function app_private.deadline_at(
  p_last_check_in_at timestamptz,
  p_interval_hours smallint
)
returns timestamptz
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_interval_hours not in (24, 36, 48) then
    raise exception using errcode = 'P0001', message = 'INVALID_INTERVAL';
  end if;
  return p_last_check_in_at + make_interval(hours => p_interval_hours);
end;
$$;

create or replace function app_private.create_cycle(
  p_safety_plan_id uuid,
  p_anchor_at timestamptz,
  p_interval_hours smallint,
  p_resource_version bigint,
  p_policy_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_alert_id uuid;
  expected_deadline timestamptz;
begin
  expected_deadline := app_private.deadline_at(p_anchor_at, p_interval_hours);

  insert into public.alerts (
    safety_plan_id,
    source,
    state,
    deadline_at,
    cycle_resource_version,
    policy_version
  )
  values (
    p_safety_plan_id,
    'deadline',
    'scheduled',
    expected_deadline,
    p_resource_version,
    p_policy_version
  )
  returning id into created_alert_id;

  insert into public.scheduling_intents (
    safety_plan_id,
    alert_id,
    intent_key,
    kind,
    due_at,
    resource_version,
    policy_version
  )
  select
    p_safety_plan_id,
    created_alert_id,
    'cycle:' || p_resource_version::text || ':' || policy.step_key,
    policy.kind,
    p_anchor_at + policy.due_offset,
    p_resource_version,
    p_policy_version
  from app_private.check_in_policy_steps as policy
  where policy.policy_version = p_policy_version
    and policy.interval_hours = p_interval_hours;

  if not found then
    raise exception using errcode = 'P0001', message = 'POLICY_NOT_FOUND';
  end if;
  return created_alert_id;
end;
$$;

create or replace function app_private.cancel_open_cycle(
  p_safety_plan_id uuid,
  p_now timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_alert_id uuid;
begin
  update public.alerts
  set state = 'cancelled',
      ended_at = p_now,
      resource_version = resource_version + 1
  where safety_plan_id = p_safety_plan_id
    and state not in ('resolved', 'cancelled')
  returning id into cancelled_alert_id;

  update public.scheduling_intents
  set status = 'stale'
  where safety_plan_id = p_safety_plan_id
    and status in ('pending', 'queued');

  return cancelled_alert_id;
end;
$$;

create or replace function app_private.safety_status_projection(
  p_user_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  plan public.safety_plans;
  current_alert jsonb;
  confirmed_count integer;
begin
  select * into plan
  from public.safety_plans
  where user_id = p_user_id;

  select count(*)::integer into confirmed_count
  from public.trusted_contacts
  where user_id = p_user_id
    and status = 'confirmed';

  if plan.id is not null then
    select jsonb_build_object('id', alert.id, 'state', alert.state)
    into current_alert
    from public.alerts as alert
    where alert.safety_plan_id = plan.id
      and alert.state not in ('resolved', 'cancelled')
    order by alert.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'serverTime', p_now,
    'plan', jsonb_build_object(
      'state', coalesce(plan.state, 'inactive'),
      'intervalHours', coalesce(plan.check_in_interval_hours, 36),
      'lastCheckInAt', plan.last_check_in_at,
      'nextDeadlineAt', plan.next_deadline_at,
      'snoozedUntil', plan.snoozed_until
    ),
    'contactSummary', jsonb_build_object('confirmedCount', confirmed_count),
    'currentAlert', current_alert
  );
end;
$$;

create or replace function app_private.onboarding_projection(
  p_user_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  profile public.profiles;
  plan public.safety_plans;
  enabled_devices integer;
begin
  select * into profile from public.profiles where user_id = p_user_id;
  select * into plan from public.safety_plans where user_id = p_user_id;
  select count(*)::integer into enabled_devices
  from public.user_devices
  where user_id = p_user_id and enabled;

  return jsonb_build_object(
    'serverTime', p_now,
    'profile', jsonb_build_object(
      'displayName', profile.display_name,
      'timezone', profile.timezone,
      'accountState', profile.account_state
    ),
    'safetyPlan', jsonb_build_object(
      'state', coalesce(plan.state, 'inactive'),
      'intervalHours', coalesce(plan.check_in_interval_hours, 36),
      'lastCheckInAt', plan.last_check_in_at,
      'nextDeadlineAt', plan.next_deadline_at
    ),
    'push', jsonb_build_object(
      'registration', case when enabled_devices > 0 then 'registered' else 'none' end
    )
  );
end;
$$;

create or replace function app_private.settings_projection(
  p_user_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  profile public.profiles;
  plan public.safety_plans;
  email_address text;
  total_contacts integer;
  accepted_contacts integer;
  enabled_devices integer;
  all_devices integer;
begin
  select * into profile from public.profiles where user_id = p_user_id;
  select email into email_address from auth.users where id = p_user_id;
  select * into plan from public.safety_plans where user_id = p_user_id;
  select count(*)::integer,
         count(*) filter (where status = 'confirmed')::integer
  into total_contacts, accepted_contacts
  from public.trusted_contacts
  where user_id = p_user_id and status <> 'revoked';
  select count(*) filter (where enabled)::integer, count(*)::integer
  into enabled_devices, all_devices
  from public.user_devices
  where user_id = p_user_id;

  return jsonb_build_object(
    'serverTime', p_now,
    'profile', jsonb_build_object(
      'displayName', profile.display_name,
      'email', email_address,
      'timezone', profile.timezone
    ),
    'safetyPlan', jsonb_build_object(
      'state', coalesce(plan.state, 'inactive'),
      'intervalHours', coalesce(plan.check_in_interval_hours, 36),
      'nextDeadlineAt', plan.next_deadline_at,
      'snoozedUntil', plan.snoozed_until
    ),
    'contacts', jsonb_build_object(
      'totalCount', total_contacts,
      'acceptedCount', accepted_contacts
    ),
    'push', jsonb_build_object(
      'registration', case
        when enabled_devices > 0 then 'registered'
        when all_devices > 0 then 'disabled'
        else 'none'
      end
    ),
    'account', jsonb_build_object(
      'exportRequest', null,
      'deletionRequest', null
    ),
    'allowedActions', jsonb_build_object(
      'canUpdateProfile', profile.account_state = 'active',
      'canUpdateSafetyPlan', profile.account_state = 'active',
      'canDisableSafetyPlan', profile.account_state = 'active' and plan.state <> 'inactive',
      'canRequestExport', false,
      'canRequestDeletion', false
    )
  );
end;
$$;

create or replace function app_private.update_profile(
  p_user_id uuid,
  p_display_name text,
  p_timezone text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(p_display_name);
  normalized_timezone text := btrim(p_timezone);
begin
  perform app_private.assert_active_account(p_user_id);
  if char_length(normalized_name) not between 1 and 80 then
    raise exception using errcode = 'P0001', message = 'INVALID_DISPLAY_NAME';
  end if;
  if not app_private.is_valid_iana_timezone(normalized_timezone) then
    raise exception using errcode = 'P0001', message = 'INVALID_TIMEZONE';
  end if;

  update public.profiles
  set display_name = normalized_name,
      timezone = normalized_timezone
  where user_id = p_user_id;

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'profile.updated', 'profile', p_user_id,
    p_correlation_id, jsonb_build_object('timezone', normalized_timezone)
  );

  return app_private.settings_projection(p_user_id, p_now);
end;
$$;

create or replace function app_private.register_device(
  p_user_id uuid,
  p_platform text,
  p_expo_push_token text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_id uuid;
begin
  perform app_private.assert_active_account(p_user_id);
  if p_platform not in ('android', 'ios') then
    raise exception using errcode = 'P0001', message = 'INVALID_PLATFORM';
  end if;
  if char_length(p_expo_push_token) not between 10 and 512 then
    raise exception using errcode = 'P0001', message = 'INVALID_PUSH_TOKEN';
  end if;

  insert into public.user_devices (
    user_id, platform, expo_push_token, enabled, last_seen_at
  ) values (
    p_user_id, p_platform, p_expo_push_token, true, p_now
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      enabled = true,
      last_seen_at = excluded.last_seen_at
  returning id into device_id;

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'device.registered', 'user_device', device_id,
    p_correlation_id, jsonb_build_object('platform', p_platform)
  );

  return jsonb_build_object('registered', true, 'serverTime', p_now);
end;
$$;

create or replace function app_private.disable_device(
  p_user_id uuid,
  p_expo_push_token text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  device_id uuid;
begin
  perform app_private.assert_active_account(p_user_id);
  update public.user_devices
  set enabled = false,
      last_seen_at = p_now
  where user_id = p_user_id
    and expo_push_token = p_expo_push_token
  returning id into device_id;

  if device_id is null then
    raise exception using errcode = 'P0001', message = 'DEVICE_NOT_FOUND';
  end if;

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'device.disabled', 'user_device', device_id,
    p_correlation_id, '{}'::jsonb
  );
  return jsonb_build_object('disabled', true, 'serverTime', p_now);
end;
$$;

create or replace function app_private.upsert_safety_plan(
  p_user_id uuid,
  p_interval_hours smallint,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.profiles;
  plan public.safety_plans;
  anchor_at timestamptz;
  next_version bigint;
  created_check_in_id uuid;
begin
  profile := app_private.assert_active_account(p_user_id);
  if profile.display_name is null then
    raise exception using errcode = 'P0001', message = 'PROFILE_INCOMPLETE';
  end if;
  if p_interval_hours not in (24, 36, 48) then
    raise exception using errcode = 'P0001', message = 'INVALID_INTERVAL';
  end if;

  select * into plan
  from public.safety_plans
  where user_id = p_user_id
  for update;

  if plan.id is null then
    insert into public.safety_plans (
      user_id, state, check_in_interval_hours, last_check_in_at,
      next_deadline_at, policy_version, resource_version
    ) values (
      p_user_id, 'active', p_interval_hours, p_now,
      app_private.deadline_at(p_now, p_interval_hours), 1, 1
    ) returning * into plan;
    anchor_at := p_now;
    next_version := 1;
  else
    perform app_private.cancel_open_cycle(plan.id, p_now);
    anchor_at := coalesce(plan.last_check_in_at, p_now);
    next_version := plan.resource_version + 1;
    update public.safety_plans
    set state = 'active',
        check_in_interval_hours = p_interval_hours,
        last_check_in_at = anchor_at,
        next_deadline_at = app_private.deadline_at(anchor_at, p_interval_hours),
        snoozed_until = null,
        resource_version = next_version
    where id = plan.id
    returning * into plan;
  end if;

  if not exists (
    select 1 from public.check_ins
    where safety_plan_id = plan.id and checked_in_at = anchor_at
  ) then
    insert into public.check_ins (
      user_id, safety_plan_id, idempotency_key, request_hash, source, checked_in_at
    ) values (
      p_user_id,
      plan.id,
      'system:activation:' || next_version::text,
      encode(extensions.digest('system:activation:' || next_version::text, 'sha256'), 'hex'),
      'system',
      anchor_at
    ) returning id into created_check_in_id;
  end if;

  perform app_private.create_cycle(
    plan.id, anchor_at, p_interval_hours, next_version, plan.policy_version
  );

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'safety_plan.activated', 'safety_plan', plan.id,
    p_correlation_id,
    jsonb_build_object('intervalHours', p_interval_hours, 'resourceVersion', next_version)
  );

  insert into public.outbox_events (
    business_key, aggregate_type, aggregate_id, event_type, payload
  ) values (
    'safety-plan:' || plan.id::text || ':cycle:' || next_version::text,
    'safety_plan', plan.id, 'safety_plan.cycle_started',
    jsonb_build_object('safetyPlanId', plan.id, 'resourceVersion', next_version)
  ) on conflict (business_key) do nothing;

  return app_private.settings_projection(p_user_id, p_now);
end;
$$;

create or replace function app_private.disable_safety_plan(
  p_user_id uuid,
  p_idempotency_key text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan public.safety_plans;
  disable_business_key text;
  existing_response jsonb;
  result jsonb;
begin
  perform app_private.assert_active_account(p_user_id);
  if char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_IDEMPOTENCY_KEY';
  end if;
  disable_business_key := 'safety-plan-disable:' || p_user_id::text || ':' || p_idempotency_key;

  select * into plan
  from public.safety_plans
  where user_id = p_user_id
  for update;

  if plan.id is null then
    raise exception using errcode = 'P0001', message = 'PLAN_NOT_FOUND';
  end if;
  select payload -> 'responseSnapshot'
  into existing_response
  from public.outbox_events
  where outbox_events.business_key = disable_business_key;
  if found then
    return coalesce(existing_response, app_private.settings_projection(p_user_id, p_now));
  end if;

  perform app_private.cancel_open_cycle(plan.id, p_now);
  update public.safety_plans
  set state = 'inactive',
      next_deadline_at = null,
      snoozed_until = null,
      resource_version = resource_version + 1
  where id = plan.id;

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'safety_plan.disabled', 'safety_plan', plan.id,
    p_correlation_id, '{}'::jsonb
  );
  result := app_private.settings_projection(p_user_id, p_now);
  insert into public.outbox_events (
    business_key, aggregate_type, aggregate_id, event_type, payload
  ) values (
    disable_business_key, 'safety_plan', plan.id, 'safety_plan.disabled',
    jsonb_build_object('safetyPlanId', plan.id, 'responseSnapshot', result)
  );

  return result;
end;
$$;

create or replace function app_private.perform_check_in(
  p_user_id uuid,
  p_idempotency_key text,
  p_source text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan public.safety_plans;
  existing_check_in public.check_ins;
  created_check_in_id uuid;
  cancelled_alert_id uuid;
  next_version bigint;
  request_hash_value text;
  result jsonb;
  alert_outcome jsonb;
begin
  perform app_private.assert_active_account(p_user_id);
  if char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_source <> 'mobile' then
    raise exception using errcode = 'P0001', message = 'INVALID_CHECK_IN_SOURCE';
  end if;
  request_hash_value := encode(
    extensions.digest(jsonb_build_object('source', p_source)::text, 'sha256'),
    'hex'
  );

  select * into plan
  from public.safety_plans
  where user_id = p_user_id
  for update;
  if plan.id is null then
    raise exception using errcode = 'P0001', message = 'PLAN_NOT_FOUND';
  end if;

  select * into existing_check_in
  from public.check_ins
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if existing_check_in.id is not null then
    if existing_check_in.request_hash <> request_hash_value then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return coalesce(
      existing_check_in.response_snapshot,
      app_private.safety_status_projection(p_user_id, p_now)
    );
  end if;

  if plan.state = 'inactive' then
    raise exception using errcode = 'P0001', message = 'PLAN_INACTIVE';
  end if;

  insert into public.check_ins (
    user_id, safety_plan_id, idempotency_key, request_hash, source, checked_in_at
  ) values (
    p_user_id, plan.id, p_idempotency_key, request_hash_value, p_source, p_now
  ) returning id into created_check_in_id;

  cancelled_alert_id := app_private.cancel_open_cycle(plan.id, p_now);
  next_version := plan.resource_version + 1;
  update public.safety_plans
  set state = 'active',
      last_check_in_at = p_now,
      next_deadline_at = app_private.deadline_at(p_now, plan.check_in_interval_hours),
      snoozed_until = null,
      resource_version = next_version
  where id = plan.id;

  perform app_private.create_cycle(
    plan.id,
    p_now,
    plan.check_in_interval_hours,
    next_version,
    plan.policy_version
  );

  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'check_in.recorded', 'check_in', created_check_in_id,
    p_correlation_id,
    jsonb_build_object(
      'safetyPlanId', plan.id,
      'resourceVersion', next_version,
      'cancelledAlertId', cancelled_alert_id
    )
  );
  insert into public.outbox_events (
    business_key, aggregate_type, aggregate_id, event_type, payload
  ) values (
    'check-in:' || created_check_in_id::text,
    'check_in', created_check_in_id, 'check_in.recorded',
    jsonb_build_object(
      'checkInId', created_check_in_id,
      'safetyPlanId', plan.id,
      'resourceVersion', next_version
    )
  );

  result := app_private.safety_status_projection(p_user_id, p_now);
  if cancelled_alert_id is not null then
    alert_outcome := jsonb_build_object(
      'alertId', cancelled_alert_id,
      'result', 'cancelled_before_notification',
      'correctionStatus', 'not_required'
    );
    result := result || jsonb_build_object('lastAlertOutcome', alert_outcome);
  end if;

  update public.check_ins
  set response_snapshot = result
  where id = created_check_in_id;
  return result;
end;
$$;

create or replace function app_private.scan_due_intents(
  p_now timestamptz,
  p_batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  intent public.scheduling_intents;
  claimed integer := 0;
begin
  if p_batch_size not between 1 and 500 then
    raise exception using errcode = 'P0001', message = 'INVALID_BATCH_SIZE';
  end if;

  for intent in
    select * from public.scheduling_intents
    where status = 'pending' and due_at <= p_now
    order by due_at, id
    for update skip locked
    limit p_batch_size
  loop
    insert into public.outbox_events (
      business_key, aggregate_type, aggregate_id, event_type, payload
    ) values (
      'scheduling-intent:' || intent.id::text,
      'scheduling_intent', intent.id, 'scheduling.intent_due',
      jsonb_build_object(
        'intentId', intent.id,
        'safetyPlanId', intent.safety_plan_id,
        'alertId', intent.alert_id,
        'kind', intent.kind,
        'resourceVersion', intent.resource_version,
        'policyVersion', intent.policy_version
      )
    ) on conflict (business_key) do nothing;

    update public.scheduling_intents
    set status = 'queued'
    where id = intent.id and status = 'pending';
    claimed := claimed + 1;
  end loop;
  return claimed;
end;
$$;

create or replace function app_private.publish_scheduling_outbox(
  p_now timestamptz,
  p_batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  event public.outbox_events;
  message_id bigint;
  published integer := 0;
begin
  for event in
    select * from public.outbox_events
    where event_type = 'scheduling.intent_due'
      and status in ('pending', 'failed')
      and available_at <= p_now
    order by available_at, created_at
    for update skip locked
    limit greatest(1, least(p_batch_size, 500))
  loop
    select pgmq.send(
      'notification_jobs',
      event.payload || jsonb_build_object('outboxEventId', event.id)
    ) into message_id;

    update public.outbox_events
    set status = 'published',
        published_at = p_now,
        queue_message_id = message_id,
        locked_at = null,
        last_error_code = null,
        attempt_count = attempt_count + 1
    where id = event.id;
    published := published + 1;
  end loop;
  return published;
end;
$$;

create or replace function app_private.claim_notification_jobs(
  p_visibility_timeout_seconds integer default 60,
  p_batch_size integer default 20
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language sql
security definer
set search_path = ''
as $$
  select queue_message.msg_id,
         queue_message.read_ct,
         queue_message.enqueued_at,
         queue_message.vt,
         queue_message.message
  from pgmq.read(
    'notification_jobs',
    greatest(0, least(p_visibility_timeout_seconds, 3600)),
    greatest(1, least(p_batch_size, 100))
  ) as queue_message;
$$;

create or replace function app_private.complete_notification_job(
  p_msg_id bigint,
  p_message jsonb,
  p_now timestamptz,
  p_correlation_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  intent public.scheduling_intents;
  plan public.safety_plans;
  result text := 'processed';
begin
  select * into intent
  from public.scheduling_intents
  where id = nullif(p_message ->> 'intentId', '')::uuid;

  if intent.id is null then
    perform pgmq.archive('notification_jobs', p_msg_id);
    return 'missing';
  end if;

  select * into plan
  from public.safety_plans
  where id = intent.safety_plan_id
  for update;

  select * into intent
  from public.scheduling_intents
  where id = intent.id
  for update;

  if intent.status = 'completed' then
    result := 'duplicate';
  elsif intent.status <> 'queued'
    or plan.state = 'inactive'
    or plan.resource_version <> intent.resource_version
    or plan.policy_version <> intent.policy_version
    or plan.next_deadline_at is distinct from (
      select deadline_at from public.alerts where id = intent.alert_id
    )
  then
    update public.scheduling_intents set status = 'stale' where id = intent.id;
    result := 'stale';
  else
    if intent.kind = 'warning' then
      update public.alerts
      set state = case when state = 'scheduled' then 'warning' else state end,
          resource_version = resource_version + 1
      where id = intent.alert_id
        and state in ('scheduled', 'warning');
    elsif intent.kind = 'deadline' then
      update public.alerts
      set state = 'triggering',
          resource_version = resource_version + 1
      where id = intent.alert_id
        and state in ('scheduled', 'warning');
    end if;

    update public.scheduling_intents
    set status = 'completed'
    where id = intent.id;

    insert into public.audit_logs (
      user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
      correlation_id, metadata
    ) values (
      plan.user_id, 'system', 'core-scheduler', 'scheduler.intent_processed',
      'scheduling_intent', intent.id, p_correlation_id,
      jsonb_build_object('kind', intent.kind, 'intentKey', intent.intent_key)
    );
  end if;

  perform pgmq.archive('notification_jobs', p_msg_id);
  return result;
end;
$$;

create or replace function app_private.consume_notification_jobs(
  p_now timestamptz,
  p_batch_size integer default 20,
  p_visibility_timeout_seconds integer default 60
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job record;
  consumed integer := 0;
begin
  for job in
    select * from app_private.claim_notification_jobs(
      p_visibility_timeout_seconds,
      p_batch_size
    )
  loop
    perform app_private.complete_notification_job(
      job.msg_id,
      job.message,
      p_now,
      extensions.gen_random_uuid()
    );
    consumed := consumed + 1;
  end loop;
  return consumed;
end;
$$;

create or replace function app_private.reconcile_scheduling_work(
  p_now timestamptz,
  p_batch_size integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  intent public.scheduling_intents;
  repaired integer := 0;
begin
  perform app_private.scan_due_intents(p_now, p_batch_size);

  for intent in
    select candidate.*
    from public.scheduling_intents as candidate
    where candidate.status = 'queued'
      and not exists (
        select 1
        from pgmq.q_notification_jobs as queue_message
        where queue_message.message ->> 'intentId' = candidate.id::text
      )
    order by candidate.updated_at, candidate.id
    for update skip locked
    limit greatest(1, least(p_batch_size, 500))
  loop
    insert into public.outbox_events (
      business_key, aggregate_type, aggregate_id, event_type, payload, status, available_at
    ) values (
      'scheduling-intent:' || intent.id::text,
      'scheduling_intent', intent.id, 'scheduling.intent_due',
      jsonb_build_object(
        'intentId', intent.id,
        'safetyPlanId', intent.safety_plan_id,
        'alertId', intent.alert_id,
        'kind', intent.kind,
        'resourceVersion', intent.resource_version,
        'policyVersion', intent.policy_version
      ),
      'pending', p_now
    )
    on conflict (business_key) do update
    set status = 'pending',
        available_at = excluded.available_at,
        queue_message_id = null,
        published_at = null,
        last_error_code = null;
    repaired := repaired + 1;
  end loop;
  return repaired;
end;
$$;

create or replace function app_private.run_core_scheduler()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  scheduler_now timestamptz := clock_timestamp();
begin
  perform app_private.record_scheduler_heartbeat();
  perform app_private.scan_due_intents(scheduler_now, 100);
  perform app_private.publish_scheduling_outbox(scheduler_now, 100);
  perform app_private.reconcile_scheduling_work(scheduler_now, 100);
  perform app_private.publish_scheduling_outbox(scheduler_now, 100);
  perform app_private.consume_notification_jobs(scheduler_now, 100, 60);
end;
$$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'imokay-foundation-heartbeat';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  select jobid into existing_job_id
  from cron.job
  where jobname = 'imokay-core-scheduler';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'imokay-core-scheduler',
    '* * * * *',
    'select app_private.run_core_scheduler()'
  );
end;
$$;

create or replace function public.internal_get_onboarding_state(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.assert_active_account(p_actor_user_id);
  return app_private.onboarding_projection(p_actor_user_id, clock_timestamp());
end;
$$;

create or replace function public.internal_update_profile(
  p_actor_user_id uuid,
  p_display_name text,
  p_timezone text,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.update_profile(
    p_actor_user_id, p_display_name, p_timezone, clock_timestamp(), p_correlation_id
  );
$$;

create or replace function public.internal_register_device(
  p_actor_user_id uuid,
  p_platform text,
  p_expo_push_token text,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.register_device(
    p_actor_user_id, p_platform, p_expo_push_token, clock_timestamp(), p_correlation_id
  );
$$;

create or replace function public.internal_disable_device(
  p_actor_user_id uuid,
  p_expo_push_token text,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.disable_device(
    p_actor_user_id, p_expo_push_token, clock_timestamp(), p_correlation_id
  );
$$;

create or replace function public.internal_upsert_safety_plan(
  p_actor_user_id uuid,
  p_interval_hours smallint,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.upsert_safety_plan(
    p_actor_user_id, p_interval_hours, clock_timestamp(), p_correlation_id
  );
$$;

create or replace function public.internal_disable_safety_plan(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.disable_safety_plan(
    p_actor_user_id, p_idempotency_key, clock_timestamp(), p_correlation_id
  );
$$;

create or replace function public.internal_get_safety_status(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.assert_active_account(p_actor_user_id);
  return app_private.safety_status_projection(p_actor_user_id, clock_timestamp());
end;
$$;

create or replace function public.internal_perform_check_in(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source text,
  p_correlation_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.perform_check_in(
    p_actor_user_id,
    p_idempotency_key,
    p_source,
    clock_timestamp(),
    p_correlation_id
  );
$$;

revoke all on app_private.check_in_policy_steps from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;

revoke all on function public.internal_get_onboarding_state(uuid)
  from public, anon, authenticated;
revoke all on function public.internal_update_profile(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_register_device(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_disable_device(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_upsert_safety_plan(uuid, smallint, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_disable_safety_plan(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.internal_get_safety_status(uuid)
  from public, anon, authenticated;
revoke all on function public.internal_perform_check_in(uuid, text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_get_onboarding_state(uuid) to service_role;
grant execute on function public.internal_update_profile(uuid, text, text, uuid) to service_role;
grant execute on function public.internal_register_device(uuid, text, text, uuid) to service_role;
grant execute on function public.internal_disable_device(uuid, text, uuid) to service_role;
grant execute on function public.internal_upsert_safety_plan(uuid, smallint, uuid) to service_role;
grant execute on function public.internal_disable_safety_plan(uuid, text, uuid) to service_role;
grant execute on function public.internal_get_safety_status(uuid) to service_role;
grant execute on function public.internal_perform_check_in(uuid, text, text, uuid) to service_role;
