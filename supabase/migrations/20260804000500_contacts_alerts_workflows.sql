-- S3: trusted contacts, public-token workflows, alerts and safe account projections.
-- Raw public tokens are returned only to the Edge boundary that creates a delivery;
-- PostgreSQL persists SHA-256 digests, never bearer tokens.

alter table public.contact_invitations
  add column scope text not null default 'trusted_contact_invitation'
    check (scope = 'trusted_contact_invitation'),
  add column sent_at timestamptz not null default now(),
  add column resend_available_at timestamptz not null default (now() + interval '5 minutes'),
  add column updated_at timestamptz not null default now();

drop index public.trusted_contacts_active_priority_key;
alter table public.trusted_contacts
  add column active_priority smallint generated always as (
    case when status <> 'revoked' then priority else null end
  ) stored,
  add constraint trusted_contacts_active_priority_key
    unique (user_id, active_priority) deferrable initially immediate;

alter table public.alert_steps
  add column contact_id uuid references public.trusted_contacts (id) on delete restrict,
  add column token_scope text check (token_scope is null or token_scope = 'alert_response'),
  add column token_expires_at timestamptz,
  add column token_consumed_at timestamptz;

alter table public.alerts
  add column acknowledged_at timestamptz,
  add column correction_status text not null default 'not_required'
    check (correction_status in ('not_required', 'queued', 'sent', 'failed')),
  add column correction_requested_at timestamptz;

alter table public.notification_deliveries
  add column invitation_id uuid references public.contact_invitations (id) on delete restrict,
  add column contact_id uuid references public.trusted_contacts (id) on delete restrict,
  add column next_attempt_at timestamptz not null default now(),
  add column receipt_due_at timestamptz,
  add column receipt_checked_at timestamptz,
  add column outcome_class text check (
    outcome_class is null or outcome_class in ('transient', 'permanent', 'unknown')
  ),
  add column payload jsonb not null default '{}'::jsonb,
  add column terminal boolean not null default false;

create index notification_deliveries_claim_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status in ('queued', 'unknown') and not terminal;

create table public.command_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  scope text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  request_hash text not null check (char_length(request_hash) = 64),
  response_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, scope, idempotency_key)
);

create table public.account_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'ready', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index account_export_requests_open_key
  on public.account_export_requests (user_id)
  where status in ('requested', 'processing', 'ready');

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index account_deletion_requests_open_key
  on public.account_deletion_requests (user_id)
  where status in ('requested', 'scheduled', 'processing');

alter table public.command_receipts enable row level security;
alter table public.command_receipts force row level security;
alter table public.account_export_requests enable row level security;
alter table public.account_export_requests force row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
revoke all on public.command_receipts, public.account_export_requests,
  public.account_deletion_requests from anon, authenticated;

create or replace function app_private.token_digest(p_token text)
returns bytea
language sql
immutable
strict
set search_path = ''
as $$
  select extensions.digest(p_token, 'sha256');
$$;

create or replace function app_private.new_public_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
$$;

create or replace function app_private.trusted_contacts_projection(
  p_user_id uuid,
  p_now timestamptz
)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'serverTime', p_now,
    'maxContacts', 3,
    'contacts', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', contact.id,
        'displayName', contact.display_name,
        'email', lower(contact.email),
        'priority', contact.priority,
        'invitation', jsonb_build_object(
          'status', case
            when invitation.status = 'pending' and invitation.expires_at <= p_now then 'expired'
            when contact.status = 'confirmed' then 'accepted'
            else coalesce(invitation.status, contact.status)
          end,
          'sentAt', invitation.sent_at,
          'expiresAt', invitation.expires_at,
          'resendAvailableAt', invitation.resend_available_at
        )
      ) order by contact.priority
    ), '[]'::jsonb)
  )
  from public.trusted_contacts as contact
  left join lateral (
    select candidate.*
    from public.contact_invitations as candidate
    where candidate.contact_id = contact.id
    order by candidate.created_at desc
    limit 1
  ) as invitation on true
  where contact.user_id = p_user_id and contact.status <> 'revoked';
$$;

create or replace function app_private.queue_invitation_delivery(
  p_invitation_id uuid,
  p_contact_id uuid,
  p_user_id uuid,
  p_now timestamptz,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_id uuid;
begin
  insert into public.notification_deliveries (
    invitation_id, contact_id, idempotency_key, channel, provider, recipient_ref,
    status, template_key, template_version, correlation_id, next_attempt_at, payload
  )
  select p_invitation_id, p_contact_id, 'invitation:' || p_invitation_id::text,
    'email', 'fake', lower(contact.email), 'queued', 'trusted-contact-invitation', 1,
    p_correlation_id, p_now,
    jsonb_build_object('ownerDisplayName', profile.display_name, 'contactDisplayName', contact.display_name)
  from public.trusted_contacts as contact
  join public.profiles as profile on profile.user_id = p_user_id
  where contact.id = p_contact_id
  on conflict (idempotency_key) do update set updated_at = excluded.updated_at
  returning id into delivery_id;
  return delivery_id;
end;
$$;

create or replace function app_private.create_trusted_contact(
  p_user_id uuid,
  p_display_name text,
  p_email text,
  p_consent_confirmed boolean,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact_id uuid;
  v_invitation_id uuid;
  raw_token text;
  next_priority smallint;
  normalized_name text := btrim(p_display_name);
  normalized_email text := lower(btrim(p_email));
begin
  perform app_private.assert_active_account(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('contacts:' || p_user_id::text, 0));
  set constraints public.trusted_contacts_active_priority_key deferred;
  if not p_consent_confirmed or char_length(normalized_name) not between 1 and 80
     or char_length(normalized_email) not between 3 and 320
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_CONTACT';
  end if;
  if exists (
    select 1 from public.trusted_contacts
    where user_id = p_user_id and lower(email) = normalized_email and status <> 'revoked'
  ) then
    raise exception using errcode = 'P0001', message = 'CONTACT_DUPLICATE';
  end if;
  if (select count(*) from public.trusted_contacts where user_id = p_user_id and status <> 'revoked') >= 3 then
    raise exception using errcode = 'P0001', message = 'CONTACT_LIMIT_REACHED';
  end if;
  select (coalesce(max(priority), 0) + 1)::smallint into next_priority
  from public.trusted_contacts where user_id = p_user_id and status <> 'revoked';

  insert into public.trusted_contacts (user_id, display_name, email, priority, status)
  values (p_user_id, normalized_name, normalized_email, next_priority, 'pending')
  returning id into contact_id;

  raw_token := app_private.new_public_token();
  insert into public.contact_invitations (
    contact_id, token_hash, expires_at, sent_at, resend_available_at
  ) values (
    contact_id, app_private.token_digest(raw_token), p_now + interval '7 days', p_now,
    p_now + interval '5 minutes'
  ) returning id into v_invitation_id;

  perform app_private.queue_invitation_delivery(
    v_invitation_id, contact_id, p_user_id, p_now, p_correlation_id
  );
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (
    p_user_id, 'user', p_user_id::text, 'contact.created', 'trusted_contact', contact_id,
    p_correlation_id, jsonb_build_object('priority', next_priority)
  );
  return jsonb_build_object(
    'projection', app_private.trusted_contacts_projection(p_user_id, p_now),
    'dispatch', jsonb_build_object('deliveryId', (
      select delivery.id from public.notification_deliveries as delivery
      where delivery.invitation_id = v_invitation_id
    ))
  );
end;
$$;

create or replace function app_private.remove_trusted_contact(
  p_user_id uuid,
  p_contact_id uuid,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.assert_active_account(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('contacts:' || p_user_id::text, 0));
  set constraints public.trusted_contacts_active_priority_key deferred;
  update public.trusted_contacts set status = 'revoked', updated_at = p_now
  where id = p_contact_id and user_id = p_user_id and status <> 'revoked';
  if not found then raise exception using errcode = 'P0001', message = 'CONTACT_NOT_FOUND'; end if;
  update public.contact_invitations set status = 'revoked', revoked_at = p_now, updated_at = p_now
  where contact_id = p_contact_id and status = 'pending';
  with ordered as (
    select id, row_number() over (order by priority, created_at, id)::smallint as new_priority
    from public.trusted_contacts where user_id = p_user_id and status <> 'revoked'
  )
  update public.trusted_contacts as contact set priority = ordered.new_priority
  from ordered where contact.id = ordered.id;
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text, 'contact.revoked', 'trusted_contact',
    p_contact_id, p_correlation_id, '{}'::jsonb);
  return app_private.trusted_contacts_projection(p_user_id, p_now);
end;
$$;

create or replace function app_private.reorder_trusted_contacts(
  p_user_id uuid,
  p_ordered_contact_ids uuid[],
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare active_count integer;
begin
  perform app_private.assert_active_account(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('contacts:' || p_user_id::text, 0));
  set constraints public.trusted_contacts_active_priority_key deferred;
  select count(*)::integer into active_count from public.trusted_contacts
  where user_id = p_user_id and status <> 'revoked';
  if coalesce(array_length(p_ordered_contact_ids, 1), 0) <> active_count
     or (select count(distinct id) from unnest(p_ordered_contact_ids) as id) <> active_count
     or exists (
       select 1 from unnest(p_ordered_contact_ids) as ordered(id)
       left join public.trusted_contacts as contact
         on contact.id = ordered.id and contact.user_id = p_user_id and contact.status <> 'revoked'
       where contact.id is null
     ) then
    raise exception using errcode = 'P0001', message = 'CONTACT_REORDER_CONFLICT';
  end if;
  update public.trusted_contacts as contact
  set priority = ordered.position::smallint, updated_at = p_now
  from unnest(p_ordered_contact_ids) with ordinality as ordered(id, position)
  where contact.id = ordered.id and contact.user_id = p_user_id;
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text, 'contacts.reordered', 'trusted_contact',
    p_correlation_id, jsonb_build_object('count', active_count));
  return app_private.trusted_contacts_projection(p_user_id, p_now);
end;
$$;

create or replace function app_private.resend_contact_invitation(
  p_user_id uuid,
  p_contact_id uuid,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.trusted_contacts;
  previous public.contact_invitations;
  invitation_id uuid;
  raw_token text;
  delivery_id uuid;
begin
  perform app_private.assert_active_account(p_user_id);
  select * into contact from public.trusted_contacts
  where id = p_contact_id and user_id = p_user_id and status <> 'revoked' for update;
  if contact.id is null then raise exception using errcode = 'P0001', message = 'CONTACT_NOT_FOUND'; end if;
  if contact.status = 'confirmed' then
    raise exception using errcode = 'P0001', message = 'INVITATION_ALREADY_ACCEPTED';
  end if;
  select * into previous from public.contact_invitations
  where contact_id = contact.id order by created_at desc limit 1 for update;
  if previous.resend_available_at > p_now then
    raise exception using errcode = 'P0001', message = 'INVITATION_COOLDOWN|' ||
      to_char(previous.resend_available_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  end if;
  update public.contact_invitations set status = 'revoked', revoked_at = p_now, updated_at = p_now
  where contact_id = contact.id and status = 'pending';
  raw_token := app_private.new_public_token();
  insert into public.contact_invitations (
    contact_id, token_hash, expires_at, sent_at, resend_available_at
  ) values (contact.id, app_private.token_digest(raw_token), p_now + interval '7 days', p_now,
    p_now + interval '5 minutes') returning id into invitation_id;
  delivery_id := app_private.queue_invitation_delivery(
    invitation_id, contact.id, p_user_id, p_now, p_correlation_id
  );
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text, 'invitation.resent', 'trusted_contact',
    contact.id, p_correlation_id, '{}'::jsonb);
  return jsonb_build_object(
    'projection', app_private.trusted_contacts_projection(p_user_id, p_now),
    'dispatch', jsonb_build_object('deliveryId', delivery_id)
  );
end;
$$;

create or replace function app_private.public_invitation_projection(
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
  invitation public.contact_invitations;
  contact public.trusted_contacts;
  owner_name text;
  effective_status text;
begin
  if char_length(p_token) not between 32 and 128 then
    return jsonb_build_object('serverTime', p_now, 'status', 'invalid', 'allowedActions', '[]'::jsonb);
  end if;
  select * into invitation from public.contact_invitations
  where token_hash = app_private.token_digest(p_token);
  if invitation.id is null then
    return jsonb_build_object('serverTime', p_now, 'status', 'invalid', 'allowedActions', '[]'::jsonb);
  end if;
  select * into contact from public.trusted_contacts where id = invitation.contact_id;
  select profile.display_name into owner_name from public.profiles as profile where profile.user_id = contact.user_id;
  effective_status := case
    when invitation.status = 'pending' and invitation.expires_at <= p_now then 'expired'
    when invitation.status = 'accepted' then 'accepted'
    when invitation.status = 'declined' then 'declined'
    when invitation.status = 'revoked' or contact.status = 'revoked' then 'revoked'
    else 'pending'
  end;
  return jsonb_build_object(
    'serverTime', p_now, 'status', effective_status, 'ownerDisplayName', owner_name,
    'contactDisplayName', contact.display_name, 'expiresAt', invitation.expires_at,
    'allowedActions', case when effective_status = 'pending'
      then jsonb_build_array('accept', 'decline') else '[]'::jsonb end
  );
end;
$$;

create or replace function app_private.consume_invitation(
  p_token text,
  p_action text,
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
  invitation public.contact_invitations;
  contact public.trusted_contacts;
begin
  if p_action not in ('accept', 'decline') or char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_PUBLIC_ACTION';
  end if;
  select * into invitation from public.contact_invitations
  where token_hash = app_private.token_digest(p_token) for update;
  if invitation.id is null then return app_private.public_invitation_projection(p_token, p_now); end if;
  select * into contact from public.trusted_contacts where id = invitation.contact_id for update;
  if invitation.status = 'pending' and invitation.expires_at > p_now and contact.status <> 'revoked' then
    update public.contact_invitations
    set status = case when p_action = 'accept' then 'accepted' else 'declined' end,
        consumed_at = p_now, updated_at = p_now
    where id = invitation.id;
    update public.trusted_contacts
    set status = case when p_action = 'accept' then 'confirmed' else 'declined' end,
        updated_at = p_now
    where id = contact.id;
    insert into public.audit_logs (
      user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
      correlation_id, metadata
    ) values (contact.user_id, 'contact', contact.id::text, 'invitation.' ||
      case when p_action = 'accept' then 'accepted' else 'declined' end,
      'contact_invitation', invitation.id, p_correlation_id, '{}'::jsonb);
  end if;
  return app_private.public_invitation_projection(p_token, p_now);
end;
$$;

create or replace function app_private.alert_context_projection(
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
  alert public.alerts;
  names jsonb;
  eligible_count integer;
  delivery_status text;
  channels jsonb;
  accepted_at timestamptz;
begin
  select * into plan from public.safety_plans where user_id = p_user_id;
  select coalesce(jsonb_agg(contact.display_name order by contact.priority), '[]'::jsonb),
         count(*)::integer
  into names, eligible_count
  from public.trusted_contacts as contact
  where contact.user_id = p_user_id and contact.status = 'confirmed';
  if plan.id is not null then
    select * into alert from public.alerts
    where safety_plan_id = plan.id and state not in ('resolved', 'cancelled')
    order by created_at desc limit 1;
  end if;
  if alert.id is not null then
    select case
      when count(*) = 0 then 'not_started'
      when count(*) filter (where status = 'failed') = count(*) then 'failed'
      when count(*) filter (where status in ('sent', 'delivered')) = count(*) then 'sent'
      when count(*) filter (where status in ('sent', 'delivered')) > 0 then 'partial'
      else 'queued'
    end,
    coalesce(jsonb_agg(distinct delivery.channel) filter (where delivery.channel in ('push', 'email')), '[]'::jsonb),
    min(delivery.created_at) filter (where delivery.status in ('sent', 'delivered'))
    into delivery_status, channels, accepted_at
    from public.notification_deliveries as delivery where delivery.alert_id = alert.id;
  end if;
  return jsonb_build_object(
    'serverTime', p_now,
    'plan', jsonb_build_object(
      'state', coalesce(plan.state, 'inactive'), 'nextDeadlineAt', plan.next_deadline_at,
      'snoozedUntil', plan.snoozed_until
    ),
    'contactSummary', jsonb_build_object(
      'eligibleCount', eligible_count, 'firstContactName', names ->> 0, 'displayNames', names
    ),
    'channelSummary', jsonb_build_object(
      'deadline', jsonb_build_array('email'),
      'sos', jsonb_build_array('push', 'email'),
      'drill', jsonb_build_array('push', 'email')
    ),
    'currentAlert', case when alert.id is null then null else jsonb_build_object(
      'id', alert.id, 'source', alert.source, 'state', alert.state,
      'triggerAt', alert.triggered_at,
      'delivery', jsonb_build_object(
        'status', coalesce(delivery_status, 'not_started'), 'channels', coalesce(channels, '[]'::jsonb),
        'acceptedAt', accepted_at
      ),
      'correction', jsonb_build_object(
        'status', alert.correction_status, 'requestedAt', alert.correction_requested_at
      )
    ) end,
    'availableActions', jsonb_build_object(
      'canCheckIn', coalesce(plan.state <> 'inactive', false),
      'canSendSos', eligible_count > 0 and (alert.id is null or alert.source = 'deadline'),
      'canSendDrill', eligible_count > 0 and alert.id is null,
      'snoozeDurationsHours', case
        when plan.state = 'active' and (alert.id is null or (
          alert.source = 'deadline' and alert.state in ('scheduled', 'warning')
        )) then jsonb_build_array(1, 4, 8) else '[]'::jsonb end
    )
  );
end;
$$;

create or replace function app_private.queue_alert_contact_delivery(
  p_alert_id uuid,
  p_contact_id uuid,
  p_step_key text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  step_id uuid;
  delivery_id uuid;
  raw_token text := app_private.new_public_token();
  owner_name text;
  contact public.trusted_contacts;
begin
  select * into contact from public.trusted_contacts where id = p_contact_id and status = 'confirmed';
  if contact.id is null then return null; end if;
  select profile.display_name into owner_name
  from public.alerts as alert
  join public.safety_plans as plan on plan.id = alert.safety_plan_id
  join public.profiles as profile on profile.user_id = plan.user_id
  where alert.id = p_alert_id;
  insert into public.alert_steps (
    alert_id, step_key, kind, due_at, status, contact_id, response_token_hash,
    token_scope, token_expires_at
  ) values (
    p_alert_id, p_step_key || ':' || contact.id::text, 'trigger', p_now, 'queued', contact.id,
    app_private.token_digest(raw_token), 'alert_response', p_now + interval '7 days'
  ) on conflict (alert_id, step_key) do update set updated_at = excluded.updated_at
  returning id into step_id;
  insert into public.notification_deliveries (
    alert_id, alert_step_id, contact_id, idempotency_key, channel, provider, recipient_ref,
    status, template_key, template_version, correlation_id, next_attempt_at, payload
  ) values (
    p_alert_id, step_id, contact.id, 'alert:' || p_alert_id::text || ':' || contact.id::text,
    'email', 'fake', lower(contact.email), 'queued', 'trusted-contact-alert', 1,
    p_correlation_id, p_now,
    jsonb_build_object('ownerDisplayName', owner_name, 'contactDisplayName', contact.display_name)
  ) on conflict (idempotency_key) do update set updated_at = excluded.updated_at
  returning id into delivery_id;
  return jsonb_build_object('deliveryId', delivery_id);
end;
$$;

create or replace function app_private.start_immediate_alert(
  p_user_id uuid,
  p_source text,
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
  current_alert public.alerts;
  first_contact_id uuid;
  alert_id uuid;
  receipt public.command_receipts;
  request_hash_value text;
  result jsonb;
  dispatch jsonb;
begin
  perform app_private.assert_active_account(p_user_id);
  if p_source not in ('sos', 'drill') then raise exception using errcode = 'P0001', message = 'INVALID_ALERT_SOURCE'; end if;
  if char_length(p_idempotency_key) not between 1 and 200 then raise exception using errcode = 'P0001', message = 'INVALID_IDEMPOTENCY_KEY'; end if;
  request_hash_value := encode(extensions.digest(p_source, 'sha256'), 'hex');
  select * into receipt from public.command_receipts
  where user_id = p_user_id and scope = 'alert:' || p_source and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> request_hash_value then raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return receipt.response_snapshot;
  end if;
  select * into plan from public.safety_plans where user_id = p_user_id for update;
  if plan.id is null or plan.state = 'inactive' then raise exception using errcode = 'P0001', message = 'SAFETY_PLAN_INACTIVE'; end if;
  select id into first_contact_id from public.trusted_contacts
  where user_id = p_user_id and status = 'confirmed' order by priority limit 1;
  if first_contact_id is null then raise exception using errcode = 'P0001', message = 'NO_ELIGIBLE_CONTACTS'; end if;
  select * into current_alert from public.alerts
  where safety_plan_id = plan.id and state not in ('resolved', 'cancelled') for update;
  if current_alert.id is not null and current_alert.source <> 'deadline' then
    raise exception using errcode = 'P0001', message = 'ALERT_ALREADY_ACTIVE';
  end if;
  perform app_private.cancel_open_cycle(plan.id, p_now);
  update public.safety_plans set resource_version = resource_version + 1 where id = plan.id
  returning resource_version into plan.resource_version;
  insert into public.alerts (
    safety_plan_id, source, state, resource_version, cycle_resource_version,
    policy_version, deadline_at, triggered_at
  ) values (
    plan.id, p_source, 'triggered', 1, plan.resource_version, plan.policy_version,
    coalesce(plan.next_deadline_at, p_now), p_now
  ) returning id into alert_id;
  dispatch := app_private.queue_alert_contact_delivery(
    alert_id, first_contact_id, 'initial', p_now, p_correlation_id
  );
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text,
    case when p_source = 'drill' then 'drill.triggered' else 'alert.triggered' end,
    'alert', alert_id, p_correlation_id, jsonb_build_object('source', p_source));
  result := jsonb_build_object(
    'projection', app_private.alert_context_projection(p_user_id, p_now), 'dispatch', dispatch
  );
  insert into public.command_receipts (user_id, scope, idempotency_key, request_hash, response_snapshot)
  values (p_user_id, 'alert:' || p_source, p_idempotency_key, request_hash_value, result);
  return result;
end;
$$;

create or replace function app_private.snooze_safety_plan(
  p_user_id uuid,
  p_duration_hours smallint,
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
  alert public.alerts;
  receipt public.command_receipts;
  request_hash_value text;
  result jsonb;
  next_version bigint;
begin
  perform app_private.assert_active_account(p_user_id);
  if p_duration_hours not in (1, 4, 8) then raise exception using errcode = 'P0001', message = 'INVALID_SNOOZE_DURATION'; end if;
  request_hash_value := encode(extensions.digest(p_duration_hours::text, 'sha256'), 'hex');
  select * into receipt from public.command_receipts
  where user_id = p_user_id and scope = 'snooze' and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> request_hash_value then raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return receipt.response_snapshot;
  end if;
  select * into plan from public.safety_plans where user_id = p_user_id for update;
  if plan.id is null or plan.state <> 'active' then raise exception using errcode = 'P0001', message = 'SNOOZE_NOT_ALLOWED'; end if;
  select * into alert from public.alerts
  where safety_plan_id = plan.id and state not in ('resolved', 'cancelled') for update;
  if alert.id is not null and (alert.source <> 'deadline' or alert.state not in ('scheduled', 'warning')) then
    raise exception using errcode = 'P0001', message = 'SNOOZE_NOT_ALLOWED';
  end if;
  perform app_private.cancel_open_cycle(plan.id, p_now);
  next_version := plan.resource_version + 1;
  update public.safety_plans set state = 'snoozed', snoozed_until = p_now + make_interval(hours => p_duration_hours),
    next_deadline_at = p_now + make_interval(hours => p_duration_hours), resource_version = next_version
  where id = plan.id;
  perform app_private.create_cycle(plan.id, p_now + make_interval(hours => p_duration_hours) -
    make_interval(hours => plan.check_in_interval_hours), plan.check_in_interval_hours,
    next_version, plan.policy_version);
  update public.scheduling_intents
  set due_at = greatest(due_at, p_now + make_interval(hours => p_duration_hours))
  where safety_plan_id = plan.id and resource_version = next_version and status = 'pending';
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
    correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text, 'snooze.applied', 'safety_plan', plan.id,
    p_correlation_id, jsonb_build_object('durationHours', p_duration_hours));
  result := app_private.alert_context_projection(p_user_id, p_now);
  insert into public.command_receipts (user_id, scope, idempotency_key, request_hash, response_snapshot)
  values (p_user_id, 'snooze', p_idempotency_key, request_hash_value, result);
  return result;
end;
$$;

create or replace function app_private.public_alert_projection(
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
  step public.alert_steps;
  alert public.alerts;
  contact public.trusted_contacts;
  plan public.safety_plans;
  owner_name text;
  effective_status text;
  accepted_response public.alert_responses;
begin
  if char_length(p_token) not between 32 and 128 then
    return jsonb_build_object('serverTime', p_now, 'status', 'invalid', 'allowedActions', '[]'::jsonb);
  end if;
  select * into step from public.alert_steps where response_token_hash = app_private.token_digest(p_token);
  if step.id is null then return jsonb_build_object('serverTime', p_now, 'status', 'invalid', 'allowedActions', '[]'::jsonb); end if;
  select * into alert from public.alerts where id = step.alert_id;
  select * into contact from public.trusted_contacts where id = step.contact_id;
  select * into plan from public.safety_plans where id = alert.safety_plan_id;
  select display_name into owner_name from public.profiles where user_id = plan.user_id;
  select * into accepted_response from public.alert_responses
  where alert_id = alert.id and contact_id = contact.id order by responded_at desc limit 1;
  effective_status := case
    when step.token_expires_at <= p_now then 'expired'
    when alert.state = 'cancelled' then 'cancelled'
    when alert.state = 'resolved' then 'resolved'
    when step.token_consumed_at is not null then 'used'
    when contact.status <> 'confirmed' then 'revoked'
    else 'active'
  end;
  return jsonb_build_object(
    'serverTime', p_now, 'status', effective_status, 'alertReference', upper(substr(replace(alert.id::text, '-', ''), 1, 6)),
    'ownerDisplayName', owner_name, 'contactDisplayName', contact.display_name,
    'source', alert.source, 'lastCheckInAt', plan.last_check_in_at, 'deadlineAt', alert.deadline_at,
    'triggeredAt', alert.triggered_at, 'acknowledgedAt', alert.acknowledged_at, 'endedAt', alert.ended_at,
    'priority', contact.priority, 'responseAction', accepted_response.action,
    'allowedActions', case when effective_status = 'active'
      then jsonb_build_array('acknowledge', 'resolve', 'cannot_help') else '[]'::jsonb end
  );
end;
$$;

create or replace function app_private.consume_alert_response(
  p_token text,
  p_action text,
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
  step public.alert_steps;
  alert public.alerts;
  contact public.trusted_contacts;
  plan public.safety_plans;
  action_value text;
  next_contact_id uuid;
  next_version bigint;
begin
  if p_action not in ('acknowledge', 'resolve', 'cannot_help')
     or char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_PUBLIC_ACTION';
  end if;
  select * into step from public.alert_steps
  where response_token_hash = app_private.token_digest(p_token) for update;
  if step.id is null then return app_private.public_alert_projection(p_token, p_now); end if;
  select * into alert from public.alerts where id = step.alert_id for update;
  select * into contact from public.trusted_contacts where id = step.contact_id;
  select * into plan from public.safety_plans where id = alert.safety_plan_id;
  if step.token_consumed_at is null and step.token_expires_at > p_now
     and contact.status = 'confirmed' and alert.state in ('triggered', 'acknowledged') then
    action_value := p_action;
    insert into public.alert_responses (alert_id, contact_id, action, idempotency_key, responded_at)
    values (alert.id, contact.id, action_value, p_idempotency_key, p_now)
    on conflict (alert_id, contact_id, idempotency_key) do nothing;
    update public.alert_steps
    set token_consumed_at = case when p_action in ('resolve', 'cannot_help') then p_now else token_consumed_at end,
        status = case when p_action in ('resolve', 'cannot_help') then 'completed' else status end,
        updated_at = p_now
    where id = step.id;
    if p_action = 'acknowledge' then
      update public.alerts set state = 'acknowledged', acknowledged_at = coalesce(acknowledged_at, p_now)
      where id = alert.id and state = 'triggered';
    elsif p_action = 'resolve' then
      update public.alerts set state = 'resolved', acknowledged_at = coalesce(acknowledged_at, p_now), ended_at = p_now
      where id = alert.id and state in ('triggered', 'acknowledged');
      if alert.source in ('sos', 'drill') and plan.last_check_in_at is not null then
        next_version := plan.resource_version + 1;
        update public.safety_plans set resource_version = next_version where id = plan.id;
        perform app_private.create_cycle(
          plan.id, plan.last_check_in_at, plan.check_in_interval_hours,
          next_version, plan.policy_version
        );
      end if;
    elsif p_action = 'cannot_help' then
      select candidate.id into next_contact_id
      from public.trusted_contacts as candidate
      where candidate.user_id = plan.user_id and candidate.status = 'confirmed'
        and candidate.priority > contact.priority
        and not exists (
          select 1 from public.notification_deliveries as delivery
          where delivery.alert_id = alert.id and delivery.contact_id = candidate.id
            and delivery.template_key = 'trusted-contact-alert'
        )
      order by candidate.priority limit 1;
      if next_contact_id is not null then
        perform app_private.queue_alert_contact_delivery(
          alert.id, next_contact_id, 'handoff', p_now, p_correlation_id
        );
      end if;
    end if;
    insert into public.audit_logs (
      user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
      correlation_id, metadata
    ) values (plan.user_id, 'contact', contact.id::text, 'alert.response_received', 'alert',
      alert.id, p_correlation_id, jsonb_build_object('action', p_action, 'source', alert.source));
  end if;
  return app_private.public_alert_projection(p_token, p_now);
end;
$$;

create or replace function app_private.history_projection(
  p_user_id uuid,
  p_cursor text,
  p_limit integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  offset_value integer := 0;
  bounded_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  items jsonb;
  total_count integer;
  on_time_count integer;
begin
  if p_cursor is not null then
    begin
      offset_value := convert_from(decode(p_cursor, 'base64'), 'utf8')::integer;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
  end if;
  with mapped as (
    select audit.id, audit.created_at,
      case audit.event_type
        when 'check_in.recorded' then 'check_in_recorded'
        when 'scheduler.intent_processed' then 'reminder_sent'
        when 'snooze.applied' then 'snooze_applied'
        when 'alert.triggered' then 'alert_triggered'
        when 'alert.acknowledged' then 'alert_acknowledged'
        when 'alert.resolved' then 'alert_resolved'
        when 'alert.response_received' then 'contact_response_received'
        when 'alert.correction_queued' then 'correction_queued'
        when 'alert.correction_sent' then 'correction_sent'
        when 'alert.correction_failed' then 'correction_failed'
        when 'drill.triggered' then 'drill_triggered'
        when 'drill.acknowledged' then 'drill_acknowledged'
        when 'drill.resolved' then 'drill_resolved'
      end as event,
      audit.metadata
    from public.audit_logs as audit
    where audit.user_id = p_user_id
  ), page as (
    select * from mapped where event is not null order by created_at desc, id desc
    offset offset_value limit bounded_limit
  )
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'id', 'audit:' || page.id::text, 'event', page.event, 'occurredAt', page.created_at,
      'nextDeadlineAt', page.metadata ->> 'nextDeadlineAt',
      'durationHours', case when page.metadata ? 'durationHours' then (page.metadata ->> 'durationHours')::integer end,
      'channels', page.metadata -> 'channels', 'source', page.metadata ->> 'source'
    )) order by page.created_at desc, page.id desc
  ), '[]'::jsonb) into items from page;
  select count(*)::integer into total_count from public.audit_logs as audit
  where audit.user_id = p_user_id and audit.event_type in (
    'check_in.recorded', 'scheduler.intent_processed', 'snooze.applied', 'alert.triggered',
    'alert.acknowledged', 'alert.resolved', 'alert.response_received', 'alert.correction_queued',
    'alert.correction_sent', 'alert.correction_failed', 'drill.triggered', 'drill.acknowledged', 'drill.resolved'
  );
  select count(*)::integer into on_time_count from public.check_ins
  where user_id = p_user_id and source = 'mobile' and checked_in_at >= p_now - interval '7 days';
  return jsonb_build_object(
    'serverTime', p_now, 'summary', jsonb_build_object('rangeDays', 7, 'onTimeCheckInCount', on_time_count),
    'items', items,
    'nextCursor', case when offset_value + bounded_limit < total_count
      then encode(convert_to((offset_value + bounded_limit)::text, 'utf8'), 'base64') else null end
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
  export_request public.account_export_requests;
  deletion_request public.account_deletion_requests;
begin
  select * into profile from public.profiles where user_id = p_user_id;
  select email into email_address from auth.users where id = p_user_id;
  select * into plan from public.safety_plans where user_id = p_user_id;
  select count(*)::integer, count(*) filter (where status = 'confirmed')::integer
  into total_contacts, accepted_contacts from public.trusted_contacts
  where user_id = p_user_id and status <> 'revoked';
  select count(*) filter (where enabled)::integer, count(*)::integer into enabled_devices, all_devices
  from public.user_devices where user_id = p_user_id;
  select * into export_request from public.account_export_requests where user_id = p_user_id
  order by requested_at desc limit 1;
  select * into deletion_request from public.account_deletion_requests where user_id = p_user_id
  order by requested_at desc limit 1;
  return jsonb_build_object(
    'serverTime', p_now,
    'profile', jsonb_build_object('displayName', profile.display_name, 'email', email_address, 'timezone', profile.timezone),
    'safetyPlan', jsonb_build_object(
      'state', coalesce(plan.state, 'inactive'), 'intervalHours', coalesce(plan.check_in_interval_hours, 36),
      'nextDeadlineAt', plan.next_deadline_at, 'snoozedUntil', plan.snoozed_until
    ),
    'contacts', jsonb_build_object('totalCount', total_contacts, 'acceptedCount', accepted_contacts),
    'push', jsonb_build_object('registration', case
      when enabled_devices > 0 then 'registered' when all_devices > 0 then 'disabled' else 'none' end),
    'account', jsonb_build_object(
      'exportRequest', case when export_request.id is null then null else jsonb_build_object(
        'status', export_request.status, 'requestedAt', export_request.requested_at) end,
      'deletionRequest', case when deletion_request.id is null then null else jsonb_build_object(
        'status', deletion_request.status, 'requestedAt', deletion_request.requested_at) end
    ),
    'allowedActions', jsonb_build_object(
      'canUpdateProfile', profile.account_state = 'active',
      'canUpdateSafetyPlan', profile.account_state = 'active',
      'canDisableSafetyPlan', profile.account_state = 'active' and plan.state <> 'inactive',
      'canRequestExport', profile.account_state = 'active' and export_request.id is null,
      'canRequestDeletion', profile.account_state = 'active' and deletion_request.id is null
    )
  );
end;
$$;

create or replace function app_private.request_account_workflow(
  p_user_id uuid,
  p_kind text,
  p_idempotency_key text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare receipt public.command_receipts; result jsonb; request_hash_value text;
begin
  if p_kind not in ('export', 'deletion') or char_length(p_idempotency_key) not between 1 and 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_REQUEST';
  end if;
  request_hash_value := encode(extensions.digest(p_kind, 'sha256'), 'hex');
  select * into receipt from public.command_receipts
  where user_id = p_user_id and scope = 'account:' || p_kind and idempotency_key = p_idempotency_key;
  if receipt.id is not null then
    if receipt.request_hash <> request_hash_value then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return receipt.response_snapshot;
  end if;
  perform app_private.assert_active_account(p_user_id);
  if p_kind = 'export' then
    insert into public.account_export_requests (user_id, requested_at) values (p_user_id, p_now);
  else
    insert into public.account_deletion_requests (user_id, requested_at) values (p_user_id, p_now);
    update public.profiles set account_state = 'deletion_requested' where user_id = p_user_id;
  end if;
  insert into public.audit_logs (
    user_id, actor_type, actor_ref, event_type, aggregate_type, correlation_id, metadata
  ) values (p_user_id, 'user', p_user_id::text, 'account.' || p_kind || '_requested',
    'account', p_correlation_id, '{}'::jsonb);
  result := app_private.settings_projection(p_user_id, p_now);
  insert into public.command_receipts (user_id, scope, idempotency_key, request_hash, response_snapshot)
  values (p_user_id, 'account:' || p_kind, p_idempotency_key, request_hash_value, result);
  return result;
end;
$$;

-- Narrow public wrappers. Edge supplies the verified actor or a bearer token;
-- anon/authenticated roles cannot execute these directly.
create or replace function public.internal_get_trusted_contacts(p_actor_user_id uuid)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.trusted_contacts_projection(p_actor_user_id, clock_timestamp()) $$;
create or replace function public.internal_create_trusted_contact(
  p_actor_user_id uuid, p_display_name text, p_email text, p_consent_confirmed boolean, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.create_trusted_contact(p_actor_user_id, p_display_name, p_email,
  p_consent_confirmed, clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_remove_trusted_contact(
  p_actor_user_id uuid, p_contact_id uuid, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.remove_trusted_contact(p_actor_user_id, p_contact_id, clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_reorder_trusted_contacts(
  p_actor_user_id uuid, p_ordered_contact_ids uuid[], p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.reorder_trusted_contacts(p_actor_user_id, p_ordered_contact_ids,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_resend_contact_invitation(
  p_actor_user_id uuid, p_contact_id uuid, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.resend_contact_invitation(p_actor_user_id, p_contact_id,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_get_alert_context(p_actor_user_id uuid)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.alert_context_projection(p_actor_user_id, clock_timestamp()) $$;
create or replace function public.internal_snooze_safety_plan(
  p_actor_user_id uuid, p_duration_hours smallint, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.snooze_safety_plan(p_actor_user_id, p_duration_hours, p_idempotency_key,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_start_alert(
  p_actor_user_id uuid, p_source text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.start_immediate_alert(p_actor_user_id, p_source, p_idempotency_key,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_get_history(
  p_actor_user_id uuid, p_cursor text, p_limit integer
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.history_projection(p_actor_user_id, p_cursor, p_limit, clock_timestamp()) $$;
create or replace function public.internal_get_settings(p_actor_user_id uuid)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.settings_projection(p_actor_user_id, clock_timestamp()) $$;
create or replace function public.internal_request_account_workflow(
  p_actor_user_id uuid, p_kind text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.request_account_workflow(p_actor_user_id, p_kind, p_idempotency_key,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_get_public_invitation(p_token text)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.public_invitation_projection(p_token, clock_timestamp()) $$;
create or replace function public.internal_consume_public_invitation(
  p_token text, p_action text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.consume_invitation(p_token, p_action, p_idempotency_key,
  clock_timestamp(), p_correlation_id) $$;
create or replace function public.internal_get_public_alert(p_token text)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.public_alert_projection(p_token, clock_timestamp()) $$;
create or replace function public.internal_consume_public_alert(
  p_token text, p_action text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.consume_alert_response(p_token, p_action, p_idempotency_key,
  clock_timestamp(), p_correlation_id) $$;

revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.internal_get_trusted_contacts(uuid) from public, anon, authenticated;
revoke all on function public.internal_create_trusted_contact(uuid,text,text,boolean,uuid) from public, anon, authenticated;
revoke all on function public.internal_remove_trusted_contact(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.internal_reorder_trusted_contacts(uuid,uuid[],uuid) from public, anon, authenticated;
revoke all on function public.internal_resend_contact_invitation(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.internal_get_alert_context(uuid) from public, anon, authenticated;
revoke all on function public.internal_snooze_safety_plan(uuid,smallint,text,uuid) from public, anon, authenticated;
revoke all on function public.internal_start_alert(uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.internal_get_history(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.internal_get_settings(uuid) from public, anon, authenticated;
revoke all on function public.internal_request_account_workflow(uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.internal_get_public_invitation(text) from public, anon, authenticated;
revoke all on function public.internal_consume_public_invitation(text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.internal_get_public_alert(text) from public, anon, authenticated;
revoke all on function public.internal_consume_public_alert(text,text,text,uuid) from public, anon, authenticated;

grant execute on function public.internal_get_trusted_contacts(uuid) to service_role;
grant execute on function public.internal_create_trusted_contact(uuid,text,text,boolean,uuid) to service_role;
grant execute on function public.internal_remove_trusted_contact(uuid,uuid,uuid) to service_role;
grant execute on function public.internal_reorder_trusted_contacts(uuid,uuid[],uuid) to service_role;
grant execute on function public.internal_resend_contact_invitation(uuid,uuid,uuid) to service_role;
grant execute on function public.internal_get_alert_context(uuid) to service_role;
grant execute on function public.internal_snooze_safety_plan(uuid,smallint,text,uuid) to service_role;
grant execute on function public.internal_start_alert(uuid,text,text,uuid) to service_role;
grant execute on function public.internal_get_history(uuid,text,integer) to service_role;
grant execute on function public.internal_get_settings(uuid) to service_role;
grant execute on function public.internal_request_account_workflow(uuid,text,text,uuid) to service_role;
grant execute on function public.internal_get_public_invitation(text) to service_role;
grant execute on function public.internal_consume_public_invitation(text,text,text,uuid) to service_role;
grant execute on function public.internal_get_public_alert(text) to service_role;
grant execute on function public.internal_consume_public_alert(text,text,text,uuid) to service_role;
