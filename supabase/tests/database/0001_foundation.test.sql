begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'user_devices', 'user_devices exists');
select has_table('public', 'safety_plans', 'safety_plans exists');
select has_table('public', 'trusted_contacts', 'trusted_contacts exists');
select has_table('public', 'contact_invitations', 'contact_invitations exists');
select has_table('public', 'check_ins', 'check_ins exists');
select has_table('public', 'alerts', 'alerts exists');
select has_table('public', 'alert_steps', 'alert_steps exists');
select has_table('public', 'alert_responses', 'alert_responses exists');
select has_table('public', 'notification_deliveries', 'notification_deliveries exists');
select has_table('public', 'audit_logs', 'audit_logs exists');
select has_table('public', 'outbox_events', 'outbox_events exists');
select has_table('public', 'scheduling_intents', 'scheduling_intents exists');

select is(
  (
    select count(*)::integer
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname in (
        'profiles',
        'user_devices',
        'safety_plans',
        'trusted_contacts',
        'contact_invitations',
        'check_ins',
        'alerts',
        'alert_steps',
        'alert_responses',
        'notification_deliveries',
        'audit_logs',
        'outbox_events',
        'scheduling_intents'
      )
      and pg_class.relrowsecurity
      and pg_class.relforcerowsecurity
  ),
  13,
  'all domain tables enforce RLS'
);

select is(
  (select count(*)::integer from pgmq.list_queues() where queue_name = 'notification_jobs'),
  1,
  'notification queue is configured'
);

select is(
  (
    select count(*)::integer
    from cron.job
    where jobname in ('imokay-foundation-heartbeat', 'imokay-core-scheduler')
  ),
  1,
  'one scheduler heartbeat job is configured'
);

select is(
  (select count(*)::integer from public.profiles),
  2,
  'seed auth users create profiles through the lifecycle trigger'
);

set local role anon;
select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  'permission denied for table profiles',
  'anon cannot read profiles'
);
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  (select count(*)::integer from public.profiles),
  1,
  'authenticated users can read only their own profile'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated clients cannot insert profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'SELECT'),
  'authenticated clients cannot read audit logs directly'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'lifecycle@example.test',
  crypt('local-demo-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Lifecycle"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select count(*)::integer
    from public.profiles
    where user_id = '33333333-3333-4333-8333-333333333333'
  ),
  1,
  'auth user creation creates a profile'
);

delete from auth.users where id = '33333333-3333-4333-8333-333333333333';
select is(
  (
    select count(*)::integer
    from public.profiles
    where user_id = '33333333-3333-4333-8333-333333333333'
  ),
  0,
  'auth user deletion cascades the foundation profile'
);

select * from finish();
rollback;
