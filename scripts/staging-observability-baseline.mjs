import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến ${name}.`);
  return value;
};

if (required("S4_OBSERVABILITY_CONFIRMATION") !== "staging") {
  throw new Error(
    "Từ chối chạy: S4_OBSERVABILITY_CONFIRMATION phải bằng staging.",
  );
}

const supabaseUrl = new URL(required("STAGING_SUPABASE_URL"));
const expectedProjectRef = required("STAGING_EXPECTED_PROJECT_REF");
assert.equal(supabaseUrl.protocol, "https:");
assert.equal(supabaseUrl.hostname, `${expectedProjectRef}.supabase.co`);

const baseUrl = supabaseUrl.toString().replace(/\/$/, "");
const publishableKey = required("STAGING_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.STAGING_SUPABASE_SECRET_KEY?.trim();
if (!serviceRoleKey) {
  throw new Error("Thiếu biến STAGING_SUPABASE_SERVICE_ROLE_KEY.");
}
assert.match(
  serviceRoleKey,
  /^[^.]+\.[^.]+\.[^.]+$/,
  "Observability snapshot cần legacy service_role JWT; không dùng sb_secret key.",
);
const requestedSamples = Number(process.env.S4_OBSERVABILITY_SAMPLES ?? "30");
assert.ok(Number.isInteger(requestedSamples));
assert.ok(requestedSamples >= 10 && requestedSamples <= 100);

const latencies = [];
const errors = [];
for (let index = 0; index < requestedSamples; index += 1) {
  const started = performance.now();
  try {
    const response = await fetch(
      `${baseUrl}/functions/v1/public-api/v1/health`,
      {
        headers: { apikey: publishableKey },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }
    latencies.push(Math.round(performance.now() - started));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

const opsResponse = await fetch(
  `${baseUrl}/rest/v1/rpc/internal_get_operational_snapshot`,
  {
    body: "{}",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  },
);
if (opsResponse.status !== 200) {
  throw new Error(`Operational snapshot HTTP ${opsResponse.status}.`);
}
const operations = await opsResponse.json();
assert.doesNotMatch(
  JSON.stringify(operations),
  /recipient|authorization|email|token/i,
);

const sorted = latencies.toSorted((left, right) => left - right);
const percentile = (ratio) =>
  sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
const average =
  sorted.length === 0
    ? null
    : Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length);

const report = {
  checkedAt: new Date().toISOString(),
  edgeHealthLatencyMs: {
    average,
    max: sorted.at(-1) ?? null,
    p50: percentile(0.5) ?? null,
    p95: percentile(0.95) ?? null,
  },
  errorRate: `${errors.length}/${requestedSamples}`,
  operations,
  projectRef: expectedProjectRef,
  samples: requestedSamples,
};
console.info(JSON.stringify(report, null, 2));

assert.equal(errors.length, 0, `Health errors: ${errors.join(" | ")}`);
assert.equal(typeof operations.scheduler?.heartbeatAgeSeconds, "number");
assert.ok(operations.scheduler.heartbeatAgeSeconds < 180);
assert.equal(operations.scheduler.cronFailuresLastHour, 0);
assert.equal(operations.scheduling?.overdueUntriggered, 0);
assert.equal(operations.outbox?.failed, 0);
assert.equal(operations.deliveries?.deadLetter, 0);
