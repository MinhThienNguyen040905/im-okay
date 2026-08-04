-- S3 notification outbox/dispatcher state. Provider HTTP calls remain in Edge Functions.

create or replace function app_private.claim_notification_deliveries(
  p_now timestamptz,
  p_batch_size integer default 20,
  p_delivery_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery public.notification_deliveries;
  result jsonb := '[]'::jsonb;
  raw_token text;
begin
  for delivery in
    select candidate.* from public.notification_deliveries as candidate
    where candidate.status in ('queued', 'unknown')
      and not candidate.terminal
      and candidate.next_attempt_at <= p_now
      and (p_delivery_id is null or candidate.id = p_delivery_id)
    order by candidate.next_attempt_at, candidate.created_at, candidate.id
    for update skip locked
    limit greatest(1, least(p_batch_size, 100))
  loop
    raw_token := null;
    if delivery.invitation_id is not null then
      raw_token := app_private.new_public_token();
      update public.contact_invitations
      set token_hash = app_private.token_digest(raw_token), updated_at = p_now
      where id = delivery.invitation_id and status = 'pending';
      if not found then
        update public.notification_deliveries
        set status = 'failed', terminal = true, outcome_class = 'permanent',
            last_error_code = 'INVITATION_NOT_ACTIVE', updated_at = p_now
        where id = delivery.id;
        continue;
      end if;
    elsif delivery.alert_step_id is not null and delivery.template_key = 'trusted-contact-alert' then
      raw_token := app_private.new_public_token();
      update public.alert_steps
      set response_token_hash = app_private.token_digest(raw_token), updated_at = p_now
      where id = delivery.alert_step_id and token_consumed_at is null;
      if not found then
        update public.notification_deliveries
        set status = 'failed', terminal = true, outcome_class = 'permanent',
            last_error_code = 'ALERT_LINK_NOT_ACTIVE', updated_at = p_now
        where id = delivery.id;
        continue;
      end if;
    end if;

    update public.notification_deliveries
    set attempt_count = attempt_count + 1,
        last_attempt_at = p_now,
        outcome_class = null,
        updated_at = p_now
    where id = delivery.id;

    result := result || jsonb_build_array(jsonb_build_object(
      'id', delivery.id,
      'channel', delivery.channel,
      'recipientRef', delivery.recipient_ref,
      'idempotencyKey', delivery.idempotency_key,
      'templateKey', delivery.template_key,
      'templateVersion', delivery.template_version,
      'payload', delivery.payload,
      'publicToken', raw_token,
      'attemptCount', delivery.attempt_count + 1
    ));
  end loop;
  return result;
end;
$$;

create or replace function app_private.record_notification_outcome(
  p_delivery_id uuid,
  p_outcome text,
  p_provider text,
  p_provider_message_id text,
  p_error_code text,
  p_now timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery public.notification_deliveries;
  delay_seconds integer;
begin
  select * into delivery from public.notification_deliveries where id = p_delivery_id for update;
  if delivery.id is null then raise exception using errcode = 'P0001', message = 'DELIVERY_NOT_FOUND'; end if;
  if delivery.status in ('sent', 'delivered') then return 'duplicate'; end if;
  if p_outcome = 'sent' then
    update public.notification_deliveries
    set provider = p_provider, provider_message_id = p_provider_message_id, status = 'sent',
        terminal = delivery.channel = 'email', outcome_class = null, last_error_code = null,
        receipt_due_at = case when delivery.channel = 'push' then p_now + interval '15 minutes' else null end,
        updated_at = p_now
    where id = delivery.id;
    return 'sent';
  elsif p_outcome = 'permanent' then
    update public.notification_deliveries set provider = p_provider, status = 'failed', terminal = true,
      outcome_class = 'permanent', last_error_code = left(coalesce(p_error_code, 'PROVIDER_REJECTED'), 100),
      updated_at = p_now where id = delivery.id;
    if p_error_code = 'DeviceNotRegistered' and delivery.channel = 'push' then
      update public.user_devices set enabled = false, updated_at = p_now
      where expo_push_token = delivery.recipient_ref;
    end if;
    return 'failed';
  elsif p_outcome = 'unknown' then
    update public.notification_deliveries set provider = p_provider, status = 'unknown', terminal = false,
      outcome_class = 'unknown', last_error_code = left(coalesce(p_error_code, 'PROVIDER_OUTCOME_UNKNOWN'), 100),
      next_attempt_at = p_now + interval '15 minutes', updated_at = p_now where id = delivery.id;
    return 'unknown';
  elsif p_outcome = 'transient' then
    if delivery.attempt_count >= 5 then
      update public.notification_deliveries set provider = p_provider, status = 'failed', terminal = true,
        outcome_class = 'transient', last_error_code = left(coalesce(p_error_code, 'PROVIDER_UNAVAILABLE'), 100),
        updated_at = p_now where id = delivery.id;
      return 'dead_letter';
    end if;
    delay_seconds := least(900, (power(2, greatest(delivery.attempt_count - 1, 0)) * 5)::integer);
    update public.notification_deliveries set provider = p_provider, status = 'queued', terminal = false,
      outcome_class = 'transient', last_error_code = left(coalesce(p_error_code, 'PROVIDER_UNAVAILABLE'), 100),
      next_attempt_at = p_now + make_interval(secs => delay_seconds), updated_at = p_now
    where id = delivery.id;
    return 'retry';
  end if;
  raise exception using errcode = 'P0001', message = 'INVALID_PROVIDER_OUTCOME';
end;
$$;

create or replace function app_private.record_expo_receipt(
  p_provider_message_id text,
  p_status text,
  p_error_code text,
  p_now timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare delivery public.notification_deliveries;
begin
  select * into delivery from public.notification_deliveries
  where provider_message_id = p_provider_message_id and channel = 'push' for update;
  if delivery.id is null then return 'missing'; end if;
  if p_status = 'ok' then
    update public.notification_deliveries set status = 'delivered', terminal = true,
      receipt_checked_at = p_now, updated_at = p_now where id = delivery.id;
    return 'delivered';
  end if;
  update public.notification_deliveries set status = 'failed', terminal = true,
    outcome_class = 'permanent', last_error_code = left(coalesce(p_error_code, 'PUSH_RECEIPT_ERROR'), 100),
    receipt_checked_at = p_now, updated_at = p_now where id = delivery.id;
  if p_error_code = 'DeviceNotRegistered' then
    update public.user_devices set enabled = false, updated_at = p_now
    where expo_push_token = delivery.recipient_ref;
  end if;
  return 'failed';
end;
$$;

create or replace function app_private.claim_expo_receipts(
  p_now timestamptz,
  p_batch_size integer default 100
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(delivery.provider_message_id order by delivery.receipt_due_at), '[]'::jsonb)
  from (
    select candidate.provider_message_id, candidate.receipt_due_at
    from public.notification_deliveries as candidate
    where candidate.channel = 'push' and candidate.status = 'sent'
      and candidate.provider_message_id is not null
      and candidate.receipt_due_at <= p_now and candidate.receipt_checked_at is null
    order by candidate.receipt_due_at
    limit greatest(1, least(p_batch_size, 1000))
  ) as delivery;
$$;

create or replace function public.internal_claim_notification_deliveries(
  p_batch_size integer, p_delivery_id uuid
) returns jsonb language sql security definer set search_path = ''
as $$ select app_private.claim_notification_deliveries(clock_timestamp(), p_batch_size, p_delivery_id) $$;
create or replace function public.internal_record_notification_outcome(
  p_delivery_id uuid, p_outcome text, p_provider text, p_provider_message_id text, p_error_code text
) returns text language sql security definer set search_path = ''
as $$ select app_private.record_notification_outcome(p_delivery_id, p_outcome, p_provider,
  p_provider_message_id, p_error_code, clock_timestamp()) $$;
create or replace function public.internal_record_expo_receipt(
  p_provider_message_id text, p_status text, p_error_code text
) returns text language sql security definer set search_path = ''
as $$ select app_private.record_expo_receipt(p_provider_message_id, p_status, p_error_code,
  clock_timestamp()) $$;
create or replace function public.internal_claim_expo_receipts(p_batch_size integer)
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.claim_expo_receipts(clock_timestamp(), p_batch_size) $$;

revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.internal_claim_notification_deliveries(integer,uuid) from public, anon, authenticated;
revoke all on function public.internal_record_notification_outcome(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.internal_record_expo_receipt(text,text,text) from public, anon, authenticated;
revoke all on function public.internal_claim_expo_receipts(integer) from public, anon, authenticated;
grant execute on function public.internal_claim_notification_deliveries(integer,uuid) to service_role;
grant execute on function public.internal_record_notification_outcome(uuid,text,text,text,text) to service_role;
grant execute on function public.internal_record_expo_receipt(text,text,text) to service_role;
grant execute on function public.internal_claim_expo_receipts(integer) to service_role;
