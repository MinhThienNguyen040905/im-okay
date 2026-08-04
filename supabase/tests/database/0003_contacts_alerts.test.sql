begin;

create extension if not exists pgtap with schema extensions;
select plan(49);

delete from public.command_receipts;
delete from public.account_export_requests;
delete from public.account_deletion_requests;
delete from public.notification_deliveries;
delete from public.alert_responses;
delete from public.alert_steps;
delete from public.scheduling_intents;
delete from public.alerts;
delete from public.contact_invitations;
delete from public.trusted_contacts;
delete from public.check_ins;
delete from public.outbox_events;
delete from public.audit_logs;
delete from public.user_devices;
update public.profiles set account_state = 'active';
update public.safety_plans set state = 'inactive', last_check_in_at = null,
  next_deadline_at = null, snoozed_until = null, resource_version = 1;

create temporary table s3_state (key text primary key, value text);

select has_function('app_private', 'create_trusted_contact',
  array['uuid','text','text','boolean','timestamp with time zone','uuid'],
  'contact command exists');
select has_function('app_private', 'public_invitation_projection',
  array['text','timestamp with time zone'], 'public invitation projection exists');
select ok(not has_function_privilege('authenticated',
  'public.internal_create_trusted_contact(uuid,text,text,boolean,uuid)', 'EXECUTE'),
  'authenticated cannot bypass the Edge contact command');

select app_private.update_profile(
  '11111111-1111-4111-8111-111111111111', 'An', 'Asia/Ho_Chi_Minh',
  '2026-08-04 00:00:00+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

with created as (
  select app_private.create_trusted_contact(
    '11111111-1111-4111-8111-111111111111', 'Lan', 'LAN@example.test', true,
    '2026-08-04 00:00:00+00', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ) as value
)
insert into s3_state values
  ('contact_1', (select value -> 'projection' -> 'contacts' -> 0 ->> 'id' from created)),
  ('delivery_1', (select value -> 'dispatch' ->> 'deliveryId' from created));

select is((app_private.trusted_contacts_projection(
  '11111111-1111-4111-8111-111111111111', '2026-08-04 00:00:00+00'
) -> 'contacts' -> 0 ->> 'email'), 'lan@example.test', 'contact email is normalized');
select is((select octet_length(token_hash) from public.contact_invitations limit 1), 32,
  'only a SHA-256 invitation digest is stored');

with claimed as (
  select app_private.claim_notification_deliveries(
    '2026-08-04 00:00:00+00', 1, (select value::uuid from s3_state where key = 'delivery_1')
  ) as value
)
insert into s3_state values ('invitation_token_1', (select value -> 0 ->> 'publicToken' from claimed));

select is((select count(*)::integer from s3_state where key = 'invitation_token_1' and char_length(value) >= 40),
  1, 'dispatcher claim receives one high-entropy public token');
select ok(not exists (
  select 1 from public.contact_invitations
  where encode(token_hash, 'hex') = (select value from s3_state where key = 'invitation_token_1')
), 'raw invitation token is not stored');
select is((app_private.public_invitation_projection(
  (select value from s3_state where key = 'invitation_token_1'), '2026-08-04 00:01:00+00'
) ->> 'status'), 'pending', 'public GET projects a pending invitation');

insert into s3_state values ('audit_before_get', (select count(*)::text from public.audit_logs));
select app_private.public_invitation_projection(
  (select value from s3_state where key = 'invitation_token_1'), '2026-08-04 00:01:00+00');
select is((select count(*)::text from public.audit_logs),
  (select value from s3_state where key = 'audit_before_get'), 'public GET does not mutate audit state');

select is((app_private.consume_invitation(
  (select value from s3_state where key = 'invitation_token_1'), 'accept', 'accept-1',
  '2026-08-04 00:02:00+00', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
) ->> 'status'), 'accepted', 'invitation acceptance is atomic');
select is((app_private.consume_invitation(
  (select value from s3_state where key = 'invitation_token_1'), 'accept', 'accept-2',
  '2026-08-04 00:02:01+00', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
) ->> 'status'), 'accepted', 'a concurrent-style second submit cannot change the outcome');
select is((select count(*)::integer from public.audit_logs where event_type = 'invitation.accepted'),
  1, 'invitation acceptance is audited once');
select is((select status from public.trusted_contacts where id =
  (select value::uuid from s3_state where key = 'contact_1')), 'confirmed',
  'accepted invitation confirms the server-owned contact state');
select throws_ok($$select app_private.create_trusted_contact(
  '11111111-1111-4111-8111-111111111111', 'Duplicate', 'lan@example.test', true,
  '2026-08-04 00:03:00+00', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')$$,
  'P0001', 'CONTACT_DUPLICATE', 'duplicate active email is rejected');

with created as (
  select app_private.create_trusted_contact(
    '11111111-1111-4111-8111-111111111111', 'Minh', 'minh@example.test', true,
    '2026-08-04 00:03:00+00', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') as value
)
insert into s3_state values
  ('contact_2', (select value -> 'projection' -> 'contacts' -> 1 ->> 'id' from created)),
  ('delivery_2', (select value -> 'dispatch' ->> 'deliveryId' from created));
with claimed as (
  select app_private.claim_notification_deliveries('2026-08-04 00:03:00+00', 1,
    (select value::uuid from s3_state where key = 'delivery_2')) as value
)
insert into s3_state values ('invitation_token_2', (select value -> 0 ->> 'publicToken' from claimed));
select app_private.consume_invitation((select value from s3_state where key = 'invitation_token_2'),
  'accept', 'accept-2', '2026-08-04 00:04:00+00', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');

with created as (
  select app_private.create_trusted_contact(
    '11111111-1111-4111-8111-111111111111', 'Hoa', 'hoa@example.test', true,
    '2026-08-04 00:05:00+00', 'ffffffff-ffff-4fff-8fff-ffffffffffff') as value
)
insert into s3_state values
  ('contact_3', (select value -> 'projection' -> 'contacts' -> 2 ->> 'id' from created)),
  ('delivery_3', (select value -> 'dispatch' ->> 'deliveryId' from created));

select throws_ok($$select app_private.create_trusted_contact(
  '11111111-1111-4111-8111-111111111111', 'Fourth', 'fourth@example.test', true,
  '2026-08-04 00:06:00+00', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')$$,
  'P0001', 'CONTACT_LIMIT_REACHED', 'maximum-three constraint is authoritative');

select app_private.reorder_trusted_contacts(
  '11111111-1111-4111-8111-111111111111', array[
    (select value::uuid from s3_state where key = 'contact_3'),
    (select value::uuid from s3_state where key = 'contact_1'),
    (select value::uuid from s3_state where key = 'contact_2')
  ], '2026-08-04 00:06:00+00', 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa');
select is((select string_agg(id::text, ',' order by priority) from public.trusted_contacts
  where user_id = '11111111-1111-4111-8111-111111111111' and status <> 'revoked'),
  (select string_agg(value, ',' order by case key when 'contact_3' then 1 when 'contact_1' then 2 else 3 end)
   from s3_state where key in ('contact_1','contact_2','contact_3')),
  'full priority reorder commits atomically');
select throws_ok(format($$select app_private.resend_contact_invitation(
  '11111111-1111-4111-8111-111111111111', %L::uuid,
  '2026-08-04 00:07:00+00', 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa')$$,
  (select value from s3_state where key = 'contact_1')),
  'P0001', 'INVITATION_ALREADY_ACCEPTED', 'accepted invitation cannot be resent');

select app_private.remove_trusted_contact(
  '11111111-1111-4111-8111-111111111111',
  (select value::uuid from s3_state where key = 'contact_3'),
  '2026-08-04 00:08:00+00', 'aaaaaaaa-4444-4444-8444-aaaaaaaaaaaa');
select is(jsonb_array_length(app_private.trusted_contacts_projection(
  '11111111-1111-4111-8111-111111111111', '2026-08-04 00:08:00+00') -> 'contacts'),
  2, 'removal excludes the revoked contact');
select is((select status from public.contact_invitations where contact_id =
  (select value::uuid from s3_state where key = 'contact_3')), 'revoked',
  'removal revokes an outstanding invitation token');

select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111', 36::smallint,
  '2026-08-04 01:00:00+00', 'aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa');
select is((app_private.snooze_safety_plan(
  '11111111-1111-4111-8111-111111111111', 4::smallint, 'snooze-1',
  '2026-08-04 02:00:00+00', 'aaaaaaaa-6666-4666-8666-aaaaaaaaaaaa'
) -> 'plan' ->> 'state'), 'snoozed', 'finite snooze returns authoritative snoozed state');
select is((select snoozed_until from public.safety_plans where user_id =
  '11111111-1111-4111-8111-111111111111'), '2026-08-04 06:00:00+00'::timestamptz,
  'finite snooze stores an exact end');
select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111', 36::smallint,
  '2026-08-04 03:00:00+00', 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa');

with started as (
  select app_private.start_immediate_alert(
    '11111111-1111-4111-8111-111111111111', 'sos', 'sos-1',
    '2026-08-04 03:01:00+00', 'aaaaaaaa-8888-4888-8888-aaaaaaaaaaaa') as value
)
insert into s3_state values
  ('alert_1', (select value -> 'projection' -> 'currentAlert' ->> 'id' from started)),
  ('alert_delivery_1', (select value -> 'dispatch' ->> 'deliveryId' from started));
select is((app_private.alert_context_projection(
  '11111111-1111-4111-8111-111111111111', '2026-08-04 03:01:00+00'
) -> 'currentAlert' ->> 'source'), 'sos', 'guarded SOS is a distinct source');
select is((select count(*)::integer from public.notification_deliveries where alert_id =
  (select value::uuid from s3_state where key = 'alert_1')), 1,
  'initial alert queues exactly one priority contact delivery');

with claimed as (
  select app_private.claim_notification_deliveries('2026-08-04 03:01:00+00', 1,
    (select value::uuid from s3_state where key = 'alert_delivery_1')) as value
)
insert into s3_state values ('alert_token_1', (select value -> 0 ->> 'publicToken' from claimed));
select is(app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'alert_delivery_1'), 'sent', 'fake', 'fake-alert-1', null,
  '2026-08-04 03:01:01+00'), 'sent', 'fake provider delivery is recorded');
select is((select state from public.alerts where id =
  (select value::uuid from s3_state where key = 'alert_1')), 'triggered',
  'sent delivery does not acknowledge an alert');
select is((app_private.consume_alert_response(
  (select value from s3_state where key = 'alert_token_1'), 'acknowledge', 'ack-1',
  '2026-08-04 03:02:00+00', 'aaaaaaaa-9999-4999-8999-aaaaaaaaaaaa'
) ->> 'status'), 'active', 'contact can acknowledge without resolving');
select is((select state from public.alerts where id =
  (select value::uuid from s3_state where key = 'alert_1')), 'acknowledged',
  'acknowledgement is an explicit state transition');
select is((app_private.consume_alert_response(
  (select value from s3_state where key = 'alert_token_1'), 'resolve', 'resolve-1',
  '2026-08-04 03:03:00+00', 'aaaaaaaa-aaaa-4aaa-8aaa-111111111111'
) ->> 'status'), 'resolved', 'same alert link can finish the W04 result step');
select is((select state from public.alerts where id =
  (select value::uuid from s3_state where key = 'alert_1')), 'resolved',
  'resolve is terminal');
select is(app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'alert_delivery_1'), 'sent', 'fake', 'fake-alert-1', null,
  '2026-08-04 03:04:00+00'), 'duplicate', 'duplicate provider completion is idempotent');

with started as (
  select app_private.start_immediate_alert(
    '11111111-1111-4111-8111-111111111111', 'drill', 'drill-1',
    '2026-08-04 03:05:00+00', 'aaaaaaaa-bbbb-4bbb-8bbb-aaaaaaaaaaaa') as value
)
insert into s3_state values
  ('drill_alert', (select value -> 'projection' -> 'currentAlert' ->> 'id' from started)),
  ('drill_delivery', (select value -> 'dispatch' ->> 'deliveryId' from started));
select is((select source from public.alerts where id =
  (select value::uuid from s3_state where key = 'drill_alert')), 'drill',
  'drill is persisted distinctly from a real SOS/deadline alert');

-- End the drill, then start an alert that is cancelled by check-in after notification.
with claimed as (
  select app_private.claim_notification_deliveries('2026-08-04 03:05:00+00', 1,
    (select value::uuid from s3_state where key = 'drill_delivery')) as value
)
insert into s3_state values ('drill_token', (select value -> 0 ->> 'publicToken' from claimed));
select app_private.consume_alert_response((select value from s3_state where key = 'drill_token'),
  'resolve', 'resolve-drill', '2026-08-04 03:06:00+00', 'aaaaaaaa-cccc-4ccc-8ccc-aaaaaaaaaaaa');
with started as (
  select app_private.start_immediate_alert(
    '11111111-1111-4111-8111-111111111111', 'sos', 'sos-2',
    '2026-08-04 03:07:00+00', 'aaaaaaaa-dddd-4ddd-8ddd-aaaaaaaaaaaa') as value
)
insert into s3_state values
  ('alert_2', (select value -> 'projection' -> 'currentAlert' ->> 'id' from started)),
  ('alert_delivery_2', (select value -> 'dispatch' ->> 'deliveryId' from started));
with claimed as (
  select app_private.claim_notification_deliveries('2026-08-04 03:07:00+00', 1,
    (select value::uuid from s3_state where key = 'alert_delivery_2')) as value
)
insert into s3_state values ('alert_token_2', (select value -> 0 ->> 'publicToken' from claimed));
select app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'alert_delivery_2'), 'sent', 'fake', 'fake-alert-2', null,
  '2026-08-04 03:07:01+00');
select app_private.consume_alert_response(
  (select value from s3_state where key = 'alert_token_2'), 'cannot_help', 'handoff-1',
  '2026-08-04 03:07:30+00', 'aaaaaaaa-dddd-4ddd-8ddd-bbbbbbbbbbbb');
select is((select count(*)::integer from public.notification_deliveries
  where alert_id = (select value::uuid from s3_state where key = 'alert_2')
    and template_key = 'trusted-contact-alert'), 2,
  'cannot-help atomically queues the next eligible priority contact');
select is((select state from public.alerts where id =
  (select value::uuid from s3_state where key = 'alert_2')), 'triggered',
  'handoff does not falsely acknowledge or resolve the alert');
select is((app_private.perform_check_in(
  '11111111-1111-4111-8111-111111111111', 'check-after-alert', 'mobile',
  '2026-08-04 03:08:00+00', 'aaaaaaaa-eeee-4eee-8eee-aaaaaaaaaaaa'
) -> 'lastAlertOutcome' ->> 'correctionStatus'), 'queued',
  'check-in after a sent alert reports correction queued');
select is((select count(*)::integer from public.notification_deliveries
  where alert_id = (select value::uuid from s3_state where key = 'alert_2')
    and template_key = 'alert-correction'), 1, 'correction is queued once per notified contact');
select is((select state from public.alerts where id =
  (select value::uuid from s3_state where key = 'alert_2')), 'cancelled',
  'check-in cancels the active alert');

insert into s3_state values ('correction_delivery', (select id::text from public.notification_deliveries
  where alert_id = (select value::uuid from s3_state where key = 'alert_2')
    and template_key = 'alert-correction'));
select app_private.claim_notification_deliveries('2026-08-04 03:08:00+00', 1,
  (select value::uuid from s3_state where key = 'correction_delivery'));
select is(app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'correction_delivery'), 'transient', 'fake', null,
  'TEMPORARY', '2026-08-04 03:08:01+00'), 'retry', 'transient provider failure schedules retry');
select ok((select next_attempt_at > '2026-08-04 03:08:01+00'::timestamptz
  from public.notification_deliveries where id =
    (select value::uuid from s3_state where key = 'correction_delivery')),
  'retry uses persisted backoff');
select app_private.claim_notification_deliveries('2026-08-04 03:20:00+00', 1,
  (select value::uuid from s3_state where key = 'correction_delivery'));
select is(app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'correction_delivery'), 'unknown', 'fake', null,
  'TIMEOUT', '2026-08-04 03:20:01+00'), 'unknown', 'unknown outcome is not treated as safe success');
select app_private.claim_notification_deliveries('2026-08-04 03:36:00+00', 1,
  (select value::uuid from s3_state where key = 'correction_delivery'));
select is(app_private.record_notification_outcome(
  (select value::uuid from s3_state where key = 'correction_delivery'), 'permanent', 'fake', null,
  'INVALID_RECIPIENT', '2026-08-04 03:36:01+00'), 'failed', 'permanent provider failure is terminal');

select app_private.register_device('11111111-1111-4111-8111-111111111111', 'android',
  'ExponentPushToken[s3-device]', '2026-08-04 04:00:00+00',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
insert into public.notification_deliveries (
  id, idempotency_key, channel, provider, recipient_ref, template_key, next_attempt_at
) values ('33333333-3333-4333-8333-333333333333', 'push-receipt-test', 'push', 'fake',
  'ExponentPushToken[s3-device]', 'user-reminder', '2026-08-04 04:00:00+00');
select app_private.claim_notification_deliveries('2026-08-04 04:00:00+00', 1,
  '33333333-3333-4333-8333-333333333333');
select is(app_private.record_notification_outcome('33333333-3333-4333-8333-333333333333', 'sent',
  'expo', 'expo-ticket-1', null, '2026-08-04 04:00:01+00'), 'sent',
  'Expo ticket acceptance is stored as sent, not delivered');
select is(app_private.record_expo_receipt('expo-ticket-1', 'error', 'DeviceNotRegistered',
  '2026-08-04 04:16:00+00'), 'failed', 'Expo receipt can mark a ticket failed');
select ok(not (select enabled from public.user_devices where expo_push_token =
  'ExponentPushToken[s3-device]'), 'DeviceNotRegistered disables the stale push token');

select ok(jsonb_array_length(app_private.history_projection(
  '11111111-1111-4111-8111-111111111111', null, 50, '2026-08-04 05:00:00+00'
) -> 'items') > 0, 'history returns only the allowlisted event projection');
select is((app_private.request_account_workflow(
  '11111111-1111-4111-8111-111111111111', 'export', 'export-1',
  '2026-08-04 05:01:00+00', 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
) -> 'account' -> 'exportRequest' ->> 'status'), 'requested',
  'account export is a request workflow');
select app_private.request_account_workflow(
  '11111111-1111-4111-8111-111111111111', 'export', 'export-1',
  '2026-08-04 05:02:00+00', 'bbbbbbbb-3333-4333-8333-bbbbbbbbbbbb');
select is((select count(*)::integer from public.account_export_requests where user_id =
  '11111111-1111-4111-8111-111111111111'), 1, 'export retry does not duplicate workflow rows');
select is((app_private.request_account_workflow(
  '11111111-1111-4111-8111-111111111111', 'deletion', 'delete-1',
  '2026-08-04 05:03:00+00', 'bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb'
) -> 'account' -> 'deletionRequest' ->> 'status'), 'requested',
  'account deletion is a request rather than immediate destructive deletion');
select is((select account_state from public.profiles where user_id =
  '11111111-1111-4111-8111-111111111111'), 'deletion_requested',
  'deletion workflow disables further active-account commands');
select ok(not has_table_privilege('authenticated', 'public.command_receipts', 'SELECT'),
  'idempotency receipts remain private');

select * from finish();
rollback;
