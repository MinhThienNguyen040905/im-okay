begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

delete from app_private.rate_limit_buckets;

select has_table('app_private', 'rate_limit_buckets',
  'distributed rate-limit buckets exist');
select has_function('app_private', 'enforce_rate_limit',
  array['text','text','integer','integer','timestamp with time zone'],
  'atomic rate-limit function exists');
select ok(not has_function_privilege('authenticated',
  'public.internal_enforce_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'authenticated clients cannot call the internal limiter directly');
select ok(has_function_privilege('service_role',
  'public.internal_enforce_rate_limit(text,text,integer,integer)', 'EXECUTE'),
  'service role can call the narrow limiter RPC');

select ok((app_private.enforce_rate_limit(
  'public:action', repeat('a', 64), 2, 60, '2026-08-09 00:00:00+00'
) ->> 'allowed')::boolean, 'first request is allowed');
select is((app_private.enforce_rate_limit(
  'public:action', repeat('a', 64), 2, 60, '2026-08-09 00:00:01+00'
) ->> 'remaining')::integer, 0, 'second request consumes the fixed-window budget');
select ok(not (app_private.enforce_rate_limit(
  'public:action', repeat('a', 64), 2, 60, '2026-08-09 00:00:02+00'
) ->> 'allowed')::boolean, 'request above the limit is denied');
select is((select request_count from app_private.rate_limit_buckets
  where scope = 'public:action' and subject_hash = repeat('a', 64)), 3,
  'denied attempts are still persisted for abuse visibility');
select is((app_private.enforce_rate_limit(
  'public:action', repeat('a', 64), 2, 60, '2026-08-09 00:00:03+00'
) ->> 'retryAt')::timestamptz, '2026-08-09 00:01:00+00'::timestamptz,
  'limiter returns the exact next window boundary');
select ok((app_private.enforce_rate_limit(
  'public:action', repeat('a', 64), 2, 60, '2026-08-09 00:01:00+00'
) ->> 'allowed')::boolean, 'a new fixed window resets the budget');
select is((select request_count from app_private.rate_limit_buckets
  where scope = 'public:action' and subject_hash = repeat('a', 64)), 1,
  'new window resets the persisted request count atomically');
select is((select subject_hash from app_private.rate_limit_buckets limit 1),
  repeat('a', 64), 'only a one-way subject hash is stored');
select throws_ok($$select app_private.enforce_rate_limit(
  'public:action', 'raw-ip-address', 2, 60, clock_timestamp())$$,
  'P0001', 'INVALID_RATE_LIMIT_POLICY', 'raw or malformed limiter subjects are rejected');
select is(app_private.cleanup_rate_limit_buckets('2026-08-12 00:00:00+00'), 1,
  'expired limiter buckets are removed by bounded retention');

select has_function('app_private', 'operational_snapshot',
  array['timestamp with time zone'], 'privacy-safe operational snapshot exists');
select ok(not has_function_privilege('authenticated',
  'public.internal_get_operational_snapshot()', 'EXECUTE'),
  'authenticated clients cannot read operational signals');
select ok(has_function_privilege('service_role',
  'public.internal_get_operational_snapshot()', 'EXECUTE'),
  'service role can read operational signals');
select ok(app_private.operational_snapshot('2026-08-09 00:00:00+00')
  ?& array['serverTime','scheduler','queue','scheduling','outbox','deliveries'],
  'snapshot contains every required operational signal family');
select ok(not (app_private.operational_snapshot('2026-08-09 00:00:00+00')::text
  ~* '(recipient|email|token|authorization)'),
  'snapshot does not project recipient PII or secrets');

select has_function('app_private', 'invoke_edge_worker', array['text'],
  'hosted Edge worker invocation function exists');
select throws_ok($$select app_private.invoke_edge_worker('attacker-function')$$,
  'P0001', 'INVALID_EDGE_WORKER', 'worker invocation is restricted to an allowlist');
select is(app_private.invoke_edge_worker('notification-consumer'), null::bigint,
  'worker invocation is a safe no-op before Vault configuration');
select is((select count(*)::integer from cron.job
  where jobname = 'imokay-notification-consumer'), 1,
  'notification consumer has exactly one hosted cron job');
select is((select count(*)::integer from cron.job
  where jobname = 'imokay-provider-receipts'), 1,
  'Expo receipt polling has exactly one hosted cron job');
select is((select count(*)::integer from cron.job
  where jobname = 'imokay-rate-limit-cleanup'), 1,
  'rate-limit retention cleanup has exactly one cron job');
select ok(exists(select 1 from pg_extension where extname = 'pg_net'),
  'pg_net is enabled for hosted worker invocation');
select ok(exists(select 1 from pg_extension where extname = 'supabase_vault'),
  'Vault is enabled for worker invocation secrets');

select * from finish();
rollback;
