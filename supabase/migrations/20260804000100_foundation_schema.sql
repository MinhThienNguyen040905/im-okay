create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to postgres, service_role;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(btrim(display_name)) between 1 and 80
  ),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  account_state text not null default 'active' check (
    account_state in ('active', 'disabled', 'deletion_requested')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  expo_push_token text not null,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create table public.safety_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (user_id) on delete cascade,
  state text not null default 'inactive' check (
    state in ('inactive', 'active', 'snoozed')
  ),
  check_in_interval_hours smallint not null default 36 check (
    check_in_interval_hours in (24, 36, 48)
  ),
  last_check_in_at timestamptz,
  next_deadline_at timestamptz,
  snoozed_until timestamptz,
  policy_version integer not null default 1 check (policy_version > 0),
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_plans_state_timestamps check (
    (state = 'inactive' and next_deadline_at is null and snoozed_until is null)
    or (state = 'active' and next_deadline_at is not null and snoozed_until is null)
    or (state = 'snoozed' and next_deadline_at is not null and snoozed_until is not null)
  )
);

create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  email text not null check (char_length(email) between 3 and 320),
  priority smallint not null check (priority between 1 and 3),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'declined', 'revoked')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index trusted_contacts_active_email_key
  on public.trusted_contacts (user_id, lower(email))
  where status <> 'revoked';

create unique index trusted_contacts_active_priority_key
  on public.trusted_contacts (user_id, priority)
  where status <> 'revoked';

create table public.contact_invitations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.trusted_contacts (id) on delete cascade,
  token_hash bytea not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'expired', 'revoked')
  ),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_invitations_consumed_state check (
    consumed_at is null or status in ('accepted', 'declined')
  )
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete restrict,
  safety_plan_id uuid not null references public.safety_plans (id) on delete restrict,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  request_hash text not null check (char_length(request_hash) = 64),
  source text not null check (source in ('mobile', 'system')),
  checked_in_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index check_ins_user_checked_in_idx
  on public.check_ins (user_id, checked_in_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  safety_plan_id uuid not null references public.safety_plans (id) on delete restrict,
  source text not null check (source in ('deadline', 'sos', 'drill')),
  state text not null check (
    state in (
      'scheduled',
      'warning',
      'triggering',
      'triggered',
      'acknowledged',
      'resolved',
      'cancelled'
    )
  ),
  resource_version bigint not null default 1 check (resource_version > 0),
  triggered_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index alerts_single_open_per_plan_key
  on public.alerts (safety_plan_id)
  where state not in ('resolved', 'cancelled');

create table public.alert_steps (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete restrict,
  step_key text not null check (char_length(step_key) between 1 and 100),
  kind text not null check (kind in ('warning', 'trigger', 'escalation', 'correction')),
  due_at timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending', 'queued', 'completed', 'cancelled', 'failed')
  ),
  response_token_hash bytea unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, step_key)
);

create index alert_steps_due_idx
  on public.alert_steps (due_at)
  where status in ('pending', 'queued');

create table public.alert_responses (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete restrict,
  contact_id uuid not null references public.trusted_contacts (id) on delete restrict,
  action text not null check (action in ('acknowledge', 'resolve', 'cannot_help')),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (alert_id, contact_id, idempotency_key)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references public.alerts (id) on delete restrict,
  alert_step_id uuid references public.alert_steps (id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 240),
  channel text not null check (channel in ('push', 'email', 'sms', 'voice')),
  provider text not null,
  recipient_ref text not null,
  provider_message_id text,
  status text not null default 'queued' check (
    status in ('queued', 'sent', 'delivered', 'failed', 'unknown')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error_code text,
  sanitized_error_detail text,
  template_key text not null,
  template_version integer not null default 1 check (template_version > 0),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_channel_enabled check (
    (channel in ('push', 'email') and provider <> 'disabled')
    or (channel in ('sms', 'voice') and provider = 'disabled')
  )
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (user_id) on delete restrict,
  actor_type text not null check (actor_type in ('user', 'contact', 'system', 'operator')),
  actor_ref text,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_aggregate_created_idx
  on public.audit_logs (aggregate_type, aggregate_id, created_at desc);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  business_key text not null unique,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (
    status in ('pending', 'publishing', 'published', 'failed')
  ),
  available_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  locked_at timestamptz,
  published_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outbox_events_claim_idx
  on public.outbox_events (available_at, created_at)
  where status in ('pending', 'failed');

create table public.scheduling_intents (
  id uuid primary key default gen_random_uuid(),
  safety_plan_id uuid not null references public.safety_plans (id) on delete restrict,
  intent_key text not null,
  kind text not null check (kind in ('warning', 'deadline', 'escalation', 'reconciliation')),
  due_at timestamptz not null,
  resource_version bigint not null check (resource_version > 0),
  policy_version integer not null check (policy_version > 0),
  status text not null default 'pending' check (
    status in ('pending', 'queued', 'completed', 'stale', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (safety_plan_id, intent_key, resource_version, policy_version)
);

create index scheduling_intents_due_idx
  on public.scheduling_intents (due_at)
  where status = 'pending';

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function app_private.enforce_trusted_contact_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  active_count integer;
begin
  if new.status = 'revoked' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  select count(*)
    into active_count
    from public.trusted_contacts
   where user_id = new.user_id
     and status <> 'revoked'
     and id <> new.id;

  if active_count >= 3 then
    raise exception using
      errcode = '23514',
      message = 'trusted_contact_limit_reached';
  end if;
  return new;
end;
$$;

create trigger auth_user_created_create_profile
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

create trigger trusted_contacts_limit_before_write
  before insert or update of user_id, status on public.trusted_contacts
  for each row execute function app_private.enforce_trusted_contact_limit();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger user_devices_set_updated_at
  before update on public.user_devices
  for each row execute function app_private.set_updated_at();
create trigger safety_plans_set_updated_at
  before update on public.safety_plans
  for each row execute function app_private.set_updated_at();
create trigger trusted_contacts_set_updated_at
  before update on public.trusted_contacts
  for each row execute function app_private.set_updated_at();
create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function app_private.set_updated_at();
create trigger alert_steps_set_updated_at
  before update on public.alert_steps
  for each row execute function app_private.set_updated_at();
create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function app_private.set_updated_at();
create trigger outbox_events_set_updated_at
  before update on public.outbox_events
  for each row execute function app_private.set_updated_at();
create trigger scheduling_intents_set_updated_at
  before update on public.scheduling_intents
  for each row execute function app_private.set_updated_at();

revoke all on all functions in schema app_private from public, anon, authenticated;
