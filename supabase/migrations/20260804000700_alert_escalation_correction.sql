-- S3 alert state machine hooks for scheduler escalation and post-alert correction.

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
  plan public.safety_plans;
  contacted integer;
  correlation_id uuid := extensions.gen_random_uuid();
begin
  select * into plan from public.safety_plans where id = p_safety_plan_id;
  select alert.id into cancelled_alert_id
  from public.alerts as alert
  where alert.safety_plan_id = p_safety_plan_id
    and alert.state not in ('resolved', 'cancelled')
  for update;
  if cancelled_alert_id is null then return null; end if;

  insert into public.notification_deliveries (
    alert_id, contact_id, idempotency_key, channel, provider, recipient_ref, status,
    template_key, template_version, correlation_id, next_attempt_at, payload
  )
  select cancelled_alert_id, original.contact_id,
    'correction:' || cancelled_alert_id::text || ':' || original.contact_id::text,
    'email', 'fake', lower(contact.email), 'queued', 'alert-correction', 1,
    correlation_id, p_now, jsonb_build_object('ownerDisplayName', profile.display_name)
  from (
    select distinct delivery.contact_id
    from public.notification_deliveries as delivery
    where delivery.alert_id = cancelled_alert_id
      and delivery.contact_id is not null
      and delivery.template_key = 'trusted-contact-alert'
      and delivery.status in ('sent', 'delivered', 'unknown')
  ) as original
  join public.trusted_contacts as contact on contact.id = original.contact_id
  join public.profiles as profile on profile.user_id = plan.user_id
  on conflict (idempotency_key) do nothing;
  get diagnostics contacted = row_count;

  update public.alerts
  set state = 'cancelled', ended_at = p_now, resource_version = resource_version + 1,
      correction_status = case when contacted > 0 then 'queued' else 'not_required' end,
      correction_requested_at = case when contacted > 0 then p_now else null end
  where id = cancelled_alert_id;
  update public.scheduling_intents set status = 'stale'
  where safety_plan_id = p_safety_plan_id and status in ('pending', 'queued');
  if contacted > 0 then
    insert into public.audit_logs (
      user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
      correlation_id, metadata
    ) values (plan.user_id, 'system', 'alert-correction', 'alert.correction_queued',
      'alert', cancelled_alert_id, correlation_id, jsonb_build_object('channels', jsonb_build_array('email')));
  end if;
  return cancelled_alert_id;
end;
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
  alert public.alerts;
  contact record;
  result text := 'processed';
begin
  select * into intent from public.scheduling_intents
  where id = nullif(p_message ->> 'intentId', '')::uuid;
  if intent.id is null then perform pgmq.archive('notification_jobs', p_msg_id); return 'missing'; end if;
  select * into plan from public.safety_plans where id = intent.safety_plan_id for update;
  select * into intent from public.scheduling_intents where id = intent.id for update;
  select * into alert from public.alerts where id = intent.alert_id for update;

  if intent.status = 'completed' then result := 'duplicate';
  elsif plan.state = 'snoozed' and plan.snoozed_until > p_now then
    return 'deferred';
  elsif intent.status <> 'queued' or plan.state = 'inactive'
    or plan.resource_version <> intent.resource_version
    or plan.policy_version <> intent.policy_version
    or plan.next_deadline_at is distinct from alert.deadline_at then
    update public.scheduling_intents set status = 'stale' where id = intent.id;
    result := 'stale';
  else
    if plan.state = 'snoozed' and plan.snoozed_until <= p_now then
      update public.safety_plans set state = 'active', snoozed_until = null where id = plan.id;
    end if;
    if intent.kind = 'warning' then
      update public.alerts set state = case when state = 'scheduled' then 'warning' else state end,
        resource_version = resource_version + 1
      where id = alert.id and state in ('scheduled', 'warning');
      insert into public.notification_deliveries (
        alert_id, idempotency_key, channel, provider, recipient_ref, status,
        template_key, template_version, correlation_id, next_attempt_at, payload
      )
      select alert.id, 'reminder:' || intent.id::text || ':' || device.id::text,
        'push', 'fake', device.expo_push_token, 'queued', 'user-reminder', 1,
        p_correlation_id, p_now, '{}'::jsonb
      from public.user_devices as device where device.user_id = plan.user_id and device.enabled
      on conflict (idempotency_key) do nothing;
      if intent.intent_key like '%:final-warning' then
        insert into public.notification_deliveries (
          alert_id, idempotency_key, channel, provider, recipient_ref, status,
          template_key, template_version, correlation_id, next_attempt_at, payload
        )
        select alert.id, 'final-reminder-email:' || intent.id::text,
          'email', 'fake', lower(auth_user.email), 'queued', 'user-reminder', 1,
          p_correlation_id, p_now, '{}'::jsonb
        from auth.users as auth_user where auth_user.id = plan.user_id and auth_user.email is not null
        on conflict (idempotency_key) do nothing;
      end if;
    elsif intent.kind = 'deadline' then
      update public.alerts set state = 'triggered', triggered_at = coalesce(triggered_at, p_now),
        resource_version = resource_version + 1
      where id = alert.id and state in ('scheduled', 'warning', 'triggering');
      select candidate.id into contact from public.trusted_contacts as candidate
      where candidate.user_id = plan.user_id and candidate.status = 'confirmed'
      order by candidate.priority limit 1;
      if contact.id is not null then
        perform app_private.queue_alert_contact_delivery(alert.id, contact.id, 'initial', p_now, p_correlation_id);
      end if;
      insert into public.audit_logs (
        user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
        correlation_id, metadata
      ) values (plan.user_id, 'system', 'core-scheduler', 'alert.triggered', 'alert', alert.id,
        p_correlation_id, jsonb_build_object('source', 'deadline'));
    elsif intent.kind = 'escalation' and alert.state = 'triggered' then
      for contact in
        select candidate.id from public.trusted_contacts as candidate
        where candidate.user_id = plan.user_id and candidate.status = 'confirmed'
          and not exists (
            select 1 from public.notification_deliveries as delivery
            where delivery.alert_id = alert.id and delivery.contact_id = candidate.id
              and delivery.template_key = 'trusted-contact-alert'
          ) order by candidate.priority
      loop
        perform app_private.queue_alert_contact_delivery(
          alert.id, contact.id, 'escalation', p_now, p_correlation_id
        );
      end loop;
    end if;
    update public.scheduling_intents set status = 'completed' where id = intent.id;
    insert into public.audit_logs (
      user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
      correlation_id, metadata
    ) values (plan.user_id, 'system', 'core-scheduler', 'scheduler.intent_processed',
      'scheduling_intent', intent.id, p_correlation_id,
      jsonb_build_object('kind', intent.kind, 'intentKey', intent.intent_key,
        'channels', case when intent.kind = 'warning' then jsonb_build_array('push') else jsonb_build_array('email') end));
  end if;
  perform pgmq.archive('notification_jobs', p_msg_id);
  return result;
end;
$$;

-- Extend provider completion with correction aggregation. Delivery success never changes
-- alert acknowledgement/resolution.
create or replace function app_private.refresh_correction_status(
  p_alert_id uuid,
  p_now timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare pending_count integer; failed_count integer; plan_user_id uuid;
begin
  select count(*) filter (where status in ('queued', 'unknown'))::integer,
         count(*) filter (where status = 'failed')::integer
  into pending_count, failed_count
  from public.notification_deliveries
  where alert_id = p_alert_id and template_key = 'alert-correction';
  if pending_count = 0 then
    update public.alerts set correction_status = case when failed_count > 0 then 'failed' else 'sent' end
    where id = p_alert_id and correction_status = 'queued';
    if found then
      select plan.user_id into plan_user_id from public.alerts as alert
      join public.safety_plans as plan on plan.id = alert.safety_plan_id where alert.id = p_alert_id;
      insert into public.audit_logs (
        user_id, actor_type, actor_ref, event_type, aggregate_type, aggregate_id,
        correlation_id, metadata
      ) values (plan_user_id, 'system', 'notification-consumer',
        case when failed_count > 0 then 'alert.correction_failed' else 'alert.correction_sent' end,
        'alert', p_alert_id, extensions.gen_random_uuid(), jsonb_build_object('channels', jsonb_build_array('email')));
    end if;
  end if;
end;
$$;

create or replace function app_private.notification_delivery_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.alert_id is not null and new.template_key = 'alert-correction'
     and new.status is distinct from old.status then
    perform app_private.refresh_correction_status(new.alert_id, clock_timestamp());
  end if;
  return new;
end;
$$;

create trigger notification_delivery_correction_status
after update of status on public.notification_deliveries
for each row execute function app_private.notification_delivery_status_trigger();

alter function app_private.perform_check_in(uuid, text, text, timestamptz, uuid)
  rename to perform_check_in_s2;

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
  result jsonb;
  check_in_id uuid;
  cancelled_alert_id uuid;
  correction_state text;
begin
  result := app_private.perform_check_in_s2(
    p_user_id, p_idempotency_key, p_source, p_now, p_correlation_id
  );
  select id into check_in_id from public.check_ins
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  select nullif(metadata ->> 'cancelledAlertId', '')::uuid into cancelled_alert_id
  from public.audit_logs where aggregate_type = 'check_in' and aggregate_id = check_in_id
  order by created_at desc limit 1;
  if cancelled_alert_id is not null then
    select correction_status into correction_state from public.alerts where id = cancelled_alert_id;
    result := result || jsonb_build_object('lastAlertOutcome', jsonb_build_object(
      'alertId', cancelled_alert_id,
      'result', case when correction_state = 'queued' then 'correction_queued'
        when correction_state = 'sent' then 'correction_sent' else 'cancelled_before_notification' end,
      'correctionStatus', coalesce(correction_state, 'not_required')
    ));
    update public.check_ins set response_snapshot = result where id = check_in_id;
  end if;
  return result;
end;
$$;

create or replace function public.internal_update_profile(
  p_actor_user_id uuid, p_display_name text, p_timezone text, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$ begin
  perform app_private.update_profile(p_actor_user_id, p_display_name, p_timezone,
    clock_timestamp(), p_correlation_id);
  return app_private.settings_projection(p_actor_user_id, clock_timestamp());
end $$;

create or replace function public.internal_upsert_safety_plan(
  p_actor_user_id uuid, p_interval_hours smallint, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$ begin
  perform app_private.upsert_safety_plan(p_actor_user_id, p_interval_hours,
    clock_timestamp(), p_correlation_id);
  return app_private.settings_projection(p_actor_user_id, clock_timestamp());
end $$;

revoke all on all functions in schema app_private from public, anon, authenticated;
revoke all on function public.internal_update_profile(uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.internal_upsert_safety_plan(uuid,smallint,uuid) from public, anon, authenticated;
grant execute on function public.internal_update_profile(uuid,text,text,uuid) to service_role;
grant execute on function public.internal_upsert_safety_plan(uuid,smallint,uuid) to service_role;
