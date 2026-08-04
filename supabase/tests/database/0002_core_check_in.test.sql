begin;

create extension if not exists pgtap with schema extensions;
select plan(51);

-- Keep this suite repeatable even when a developer ran the local smoke script
-- without resetting afterward. Every cleanup is rolled back with this test.
do $$ begin perform pgmq.purge_queue('notification_jobs'); end $$;
delete from public.notification_deliveries;
delete from public.alert_responses;
delete from public.alert_steps;
delete from public.scheduling_intents;
delete from public.alerts;
delete from public.check_ins;
delete from public.outbox_events;
delete from public.audit_logs;
delete from public.user_devices;
update public.safety_plans
set state = 'inactive',
    check_in_interval_hours = 36,
    last_check_in_at = null,
    next_deadline_at = null,
    snoozed_until = null,
    policy_version = 1,
    resource_version = 1;

select has_function(
  'app_private',
  'deadline_at',
  array['timestamp with time zone', 'smallint'],
  'authoritative deadline function exists'
);
select is(
  app_private.deadline_at('2026-08-04 00:00:00+00', 24::smallint),
  '2026-08-05 00:00:00+00'::timestamptz,
  '24-hour deadline is exact'
);
select is(
  app_private.deadline_at('2026-08-04 00:00:00+00', 36::smallint),
  '2026-08-05 12:00:00+00'::timestamptz,
  '36-hour deadline is exact'
);
select is(
  app_private.deadline_at('2026-08-04 00:00:00+00', 48::smallint),
  '2026-08-06 00:00:00+00'::timestamptz,
  '48-hour deadline is exact'
);
select is(
  app_private.deadline_at('2026-11-01 05:30:00+00', 24::smallint),
  '2026-11-02 05:30:00+00'::timestamptz,
  'deadline duration stays exact across a display-timezone DST boundary'
);
select ok(
  app_private.is_valid_iana_timezone('Asia/Ho_Chi_Minh'),
  'known IANA timezone is accepted'
);
select ok(
  not app_private.is_valid_iana_timezone('GMT+7-not-a-zone'),
  'invented timezone is rejected'
);
select is(
  (select count(*)::integer from app_private.check_in_policy_steps where policy_version = 1),
  15,
  'versioned warning policy covers five steps for each interval'
);
select is(
  (select count(*)::integer from cron.job where jobname = 'imokay-core-scheduler'),
  1,
  'one batch core scheduler is configured'
);
select is(
  (select count(*)::integer from cron.job where jobname = 'imokay-foundation-heartbeat'),
  0,
  'foundation-only heartbeat job was replaced'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.internal_perform_check_in(uuid,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass Edge and invoke internal check-in RPC'
);

select app_private.update_profile(
  '11111111-1111-4111-8111-111111111111',
  '  An Bình  ',
  'Asia/Ho_Chi_Minh',
  '2026-08-04 00:00:00+00',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);
select is(
  (select display_name from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'An Bình',
  'profile display name is normalized'
);
select is(
  (select timezone from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'Asia/Ho_Chi_Minh',
  'profile stores an IANA timezone'
);
select throws_ok(
  $$select app_private.update_profile(
    '11111111-1111-4111-8111-111111111111',
    'An',
    'invalid/timezone',
    '2026-08-04 00:00:00+00',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )$$,
  'P0001',
  'INVALID_TIMEZONE',
  'profile rejects invalid timezone before mutation'
);

select is(
  app_private.register_device(
    '11111111-1111-4111-8111-111111111111',
    'android',
    'ExponentPushToken[local-device-token]',
    '2026-08-04 00:00:00+00',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) ->> 'registered',
  'true',
  'device registration succeeds'
);
select is(
  (select count(*)::integer from public.user_devices where user_id = '11111111-1111-4111-8111-111111111111'),
  1,
  'device token lifecycle does not duplicate a registration'
);
select is(
  app_private.disable_device(
    '11111111-1111-4111-8111-111111111111',
    'ExponentPushToken[local-device-token]',
    '2026-08-04 00:01:00+00',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) ->> 'disabled',
  'true',
  'device can be disabled'
);
select ok(
  not (select enabled from public.user_devices where user_id = '11111111-1111-4111-8111-111111111111'),
  'disabled device is excluded from active delivery targets'
);

select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111',
  36::smallint,
  '2026-08-04 00:00:00+00',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
);
select is(
  (select state from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  'active',
  'safety plan activation is authoritative'
);
select is(
  (select next_deadline_at from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  '2026-08-05 12:00:00+00'::timestamptz,
  'activation deadline equals cycle anchor plus interval'
);
select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111',
  48::smallint,
  '2026-08-04 00:30:00+00',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
);
select is(
  (select check_in_interval_hours from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  48::smallint,
  'active safety plan interval can be updated'
);
select is(
  (select next_deadline_at from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  '2026-08-06 00:00:00+00'::timestamptz,
  'interval update keeps the last accepted anchor authoritative'
);
select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111',
  36::smallint,
  '2026-08-04 00:31:00+00',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
);
select is(
  (
    select count(*)::integer
    from public.scheduling_intents as intent
    join public.safety_plans as plan on plan.id = intent.safety_plan_id
    where plan.user_id = '11111111-1111-4111-8111-111111111111'
      and intent.resource_version = plan.resource_version
  ),
  5,
  'activation creates one versioned set of scheduling intents'
);
select is(
  (
    select count(*)::integer
    from public.alerts as alert
    join public.safety_plans as plan on plan.id = alert.safety_plan_id
    where plan.user_id = '11111111-1111-4111-8111-111111111111'
      and alert.state not in ('resolved', 'cancelled')
  ),
  1,
  'activation keeps exactly one open alert cycle'
);
select is(
  (select count(*)::integer from public.check_ins where user_id = '11111111-1111-4111-8111-111111111111' and source = 'system'),
  1,
  'first activation records its initial cycle anchor'
);

create temporary table first_check_in_result as
select app_private.perform_check_in(
  '11111111-1111-4111-8111-111111111111',
  'check-in-before-deadline',
  'mobile',
  '2026-08-05 11:59:59+00',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
) as value;
select is(
  (select value #>> '{plan,nextDeadlineAt}' from first_check_in_result),
  '2026-08-06T23:59:59+00:00',
  'check-in immediately before deadline starts one exact new cycle'
);
select is(
  (select count(*)::integer from public.check_ins where user_id = '11111111-1111-4111-8111-111111111111' and source = 'mobile'),
  1,
  'first mobile check-in is recorded once'
);
select is(
  app_private.perform_check_in(
    '11111111-1111-4111-8111-111111111111',
    'check-in-before-deadline',
    'mobile',
    '2026-08-05 12:00:01+00',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  (select value from first_check_in_result),
  'duplicate idempotent retry returns the original projection'
);
select is(
  (select count(*)::integer from public.check_ins where user_id = '11111111-1111-4111-8111-111111111111' and source = 'mobile'),
  1,
  'duplicate retry does not create another check-in'
);
select is(
  (
    select count(*)::integer from public.audit_logs
    where user_id = '11111111-1111-4111-8111-111111111111'
      and event_type = 'check_in.recorded'
  ),
  1,
  'successful check-in writes one audit record'
);
select is(
  (
    select count(*)::integer from public.outbox_events
    where event_type = 'check_in.recorded'
      and payload ->> 'checkInId' is not null
  ),
  1,
  'successful check-in commits its outbox event atomically'
);

select app_private.perform_check_in(
  '11111111-1111-4111-8111-111111111111',
  'check-in-at-deadline',
  'mobile',
  '2026-08-06 23:59:59+00',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
);
select is(
  (select last_check_in_at from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  '2026-08-06 23:59:59+00'::timestamptz,
  'check-in exactly at deadline is accepted as the new authoritative anchor'
);
select is(
  (
    select count(*)::integer
    from public.alerts as alert
    join public.safety_plans as plan on plan.id = alert.safety_plan_id
    where plan.user_id = '11111111-1111-4111-8111-111111111111'
      and alert.state not in ('resolved', 'cancelled')
  ),
  1,
  'exact-deadline race still leaves one open cycle'
);
select app_private.perform_check_in(
  '11111111-1111-4111-8111-111111111111',
  'check-in-after-deadline',
  'mobile',
  '2026-08-08 12:00:00+00',
  'ffffffff-ffff-4fff-8fff-ffffffffffff'
);
select is(
  (select next_deadline_at from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  '2026-08-10 00:00:00+00'::timestamptz,
  'check-in after deadline uses the accepted server time, not the stale deadline'
);

update public.profiles
set account_state = 'disabled'
where user_id = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  $$select app_private.perform_check_in(
    '11111111-1111-4111-8111-111111111111',
    'disabled-account-check-in',
    'mobile',
    '2026-08-08 12:01:00+00',
    'ffffffff-ffff-4fff-8fff-ffffffffffff'
  )$$,
  'P0001',
  'ACCOUNT_DISABLED',
  'disabled account cannot mutate safety state'
);
update public.profiles
set account_state = 'active'
where user_id = '11111111-1111-4111-8111-111111111111';

create temporary table first_disable_result as
select app_private.disable_safety_plan(
  '11111111-1111-4111-8111-111111111111',
  'disable-cycle-idempotently',
  '2026-08-08 12:02:00+00',
  '56565656-5656-4656-8656-565656565656'
) as value;
select is(
  (select value #>> '{safetyPlan,state}' from first_disable_result),
  'inactive',
  'disable returns the exact inactive safety-plan projection'
);
select app_private.upsert_safety_plan(
  '11111111-1111-4111-8111-111111111111',
  36::smallint,
  '2026-08-08 12:03:00+00',
  '56565656-5656-4656-8656-565656565656'
);
select is(
  app_private.disable_safety_plan(
    '11111111-1111-4111-8111-111111111111',
    'disable-cycle-idempotently',
    '2026-08-08 12:04:00+00',
    '56565656-5656-4656-8656-565656565656'
  ),
  (select value from first_disable_result),
  'disable retry returns its original response snapshot'
);
select is(
  (select state from public.safety_plans where user_id = '11111111-1111-4111-8111-111111111111'),
  'active',
  'old disable retry cannot disable a later cycle'
);

select app_private.upsert_safety_plan(
  '22222222-2222-4222-8222-222222222222',
  24::smallint,
  '2030-01-01 00:00:00+00',
  '12121212-1212-4212-8212-121212121212'
);
update public.scheduling_intents set due_at = '2100-01-01 00:00:00+00'
where status = 'pending';
update public.scheduling_intents as intent
set due_at = '2030-01-01 12:00:00+00'
from public.safety_plans as plan
where plan.id = intent.safety_plan_id
  and plan.user_id = '22222222-2222-4222-8222-222222222222'
  and intent.intent_key like '%:gentle-warning';
select is(
  app_private.scan_due_intents('2030-01-01 12:00:00+00', 20),
  1,
  'due scanner claims a bounded batch rather than one cron per user'
);
select is(
  app_private.publish_scheduling_outbox('2030-01-01 12:00:00+00', 20),
  1,
  'due outbox publishes one stable queue message'
);
select is(
  (
    select count(*)::integer from pgmq.q_notification_jobs
    where message ->> 'kind' = 'warning'
  ),
  1,
  'queue contains the due warning work'
);
select is(
  (select count(*)::integer from app_private.claim_notification_jobs(60, 1)),
  1,
  'worker claims the message with a visibility lease'
);
update pgmq.q_notification_jobs set vt = now() - interval '1 second';
select is(
  app_private.consume_notification_jobs('2030-01-01 12:00:01+00', 20, 60),
  1,
  'expired lease is safely reclaimed after a simulated function termination'
);
select is(
  (
    select alert.state
    from public.alerts as alert
    join public.safety_plans as plan on plan.id = alert.safety_plan_id
    where plan.user_id = '22222222-2222-4222-8222-222222222222'
      and alert.state not in ('resolved', 'cancelled')
  ),
  'warning',
  'valid warning work advances only the current alert cycle'
);
select is(
  (
    select count(*)::integer
    from public.scheduling_intents as intent
    join public.safety_plans as plan on plan.id = intent.safety_plan_id
    where plan.user_id = '22222222-2222-4222-8222-222222222222'
      and intent.status = 'completed'
  ),
  1,
  'successfully consumed intent is completed once'
);

update public.scheduling_intents as intent
set due_at = '2030-01-01 13:00:00+00'
from public.safety_plans as plan
where plan.id = intent.safety_plan_id
  and plan.user_id = '22222222-2222-4222-8222-222222222222'
  and intent.intent_key like '%:urgent-warning';
select app_private.scan_due_intents('2030-01-01 13:00:00+00', 20);
select app_private.publish_scheduling_outbox('2030-01-01 13:00:00+00', 20);
select app_private.perform_check_in(
  '22222222-2222-4222-8222-222222222222',
  'stale-old-cycle',
  'mobile',
  '2030-01-01 13:00:01+00',
  '34343434-3434-4434-8434-343434343434'
);
select is(
  app_private.consume_notification_jobs('2030-01-01 13:00:02+00', 20, 60),
  1,
  'old queued work is consumed without retrying forever'
);
select is(
  (
    select count(*)::integer
    from public.scheduling_intents as intent
    join public.safety_plans as plan on plan.id = intent.safety_plan_id
    where plan.user_id = '22222222-2222-4222-8222-222222222222'
      and intent.status = 'stale'
  ),
  4,
  'new check-in marks every unfinished old-cycle intent stale'
);
select is(
  (
    select alert.state
    from public.alerts as alert
    join public.safety_plans as plan on plan.id = alert.safety_plan_id
    where plan.user_id = '22222222-2222-4222-8222-222222222222'
      and alert.state not in ('resolved', 'cancelled')
  ),
  'scheduled',
  'stale queue work cannot advance the new alert cycle'
);

update public.scheduling_intents as intent
set due_at = '2030-01-01 14:00:00+00'
from public.safety_plans as plan
where plan.id = intent.safety_plan_id
  and plan.user_id = '22222222-2222-4222-8222-222222222222'
  and intent.resource_version = plan.resource_version
  and intent.intent_key like '%:gentle-warning';
select app_private.scan_due_intents('2030-01-01 14:00:00+00', 20);
select app_private.publish_scheduling_outbox('2030-01-01 14:00:00+00', 20);
delete from pgmq.q_notification_jobs;
select is(
  app_private.reconcile_scheduling_work('2030-01-01 14:00:01+00', 20),
  1,
  'reconciliation detects a deliberately deleted queue message'
);
select app_private.publish_scheduling_outbox('2030-01-01 14:00:01+00', 20);
select is(
  (select count(*)::integer from pgmq.q_notification_jobs),
  1,
  'reconciliation rebuilds missing work from PostgreSQL state'
);

select ok(
  not has_table_privilege('authenticated', 'public.safety_plans', 'UPDATE'),
  'authenticated clients still cannot mutate safety plans directly'
);

select * from finish();
rollback;
