import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến ${name}.`);
  return value;
};

const httpsUrl = (name) => {
  const url = new URL(required(name));
  if (url.protocol !== "https:") throw new Error(`${name} phải dùng HTTPS.`);
  if (["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`${name} không được trỏ về local.`);
  }
  return url.toString().replace(/\/$/, "");
};

const supabaseUrl = httpsUrl("STAGING_SUPABASE_URL");
const contactWebUrl = httpsUrl("STAGING_CONTACT_WEB_URL");
const publishableKey = required("STAGING_SUPABASE_PUBLISHABLE_KEY");
const internalSecret = required("STAGING_INTERNAL_FUNCTION_SECRET");
const apiBase = `${supabaseUrl}/functions/v1`;

const timedFetch = async (url, options) => {
  const started = performance.now();
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  });
  return { elapsedMs: performance.now() - started, response };
};

const requireStatus = async (response, expected) => {
  if (response.status !== expected) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
};

const latencySamples = [];
for (let index = 0; index < 10; index += 1) {
  const { elapsedMs, response } = await timedFetch(
    `${apiBase}/public-api/v1/health`,
    { headers: { apikey: publishableKey } },
  );
  await requireStatus(response, 200);
  latencySamples.push(Math.round(elapsedMs));
}

const unauthenticated = await fetch(`${apiBase}/api/v1/health`, {
  headers: { apikey: publishableKey },
  signal: AbortSignal.timeout(15_000),
});
await requireStatus(unauthenticated, 401);

const preflight = await fetch(`${apiBase}/public-api/v1/health`, {
  headers: {
    apikey: publishableKey,
    origin: contactWebUrl,
  },
  method: "OPTIONS",
  signal: AbortSignal.timeout(15_000),
});
await requireStatus(preflight, 204);
assert.equal(
  preflight.headers.get("access-control-allow-origin"),
  contactWebUrl,
);

const web = await fetch(contactWebUrl, {
  redirect: "follow",
  signal: AbortSignal.timeout(15_000),
});
await requireStatus(web, 200);
assert.match(web.headers.get("cache-control") ?? "", /no-store/i);
assert.equal(web.headers.get("referrer-policy"), "no-referrer");
assert.match(web.headers.get("x-robots-tag") ?? "", /noindex/i);
assert.match(
  web.headers.get("content-security-policy") ?? "",
  /frame-ancestors 'none'/i,
);

const opsResponse = await fetch(`${apiBase}/ops`, {
  headers: {
    apikey: publishableKey,
    "x-internal-function-secret": internalSecret,
  },
  signal: AbortSignal.timeout(15_000),
});
await requireStatus(opsResponse, 200);
const ops = await opsResponse.json();
assert.equal(typeof ops.serverTime, "string");
assert.equal(typeof ops.queue?.depth, "number");
assert.equal(typeof ops.deliveries?.deadLetter, "number");
assert.equal(typeof ops.scheduling?.overdueUntriggered, "number");
assert.doesNotMatch(
  JSON.stringify(ops),
  /recipient|authorization|email|token/i,
);

const sorted = latencySamples.toSorted((left, right) => left - right);
const percentile = (ratio) =>
  sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
const report = {
  checkedAt: new Date().toISOString(),
  contactWeb: {
    privacyHeaders: "pass",
    url: contactWebUrl,
  },
  edgeHealthLatencyMs: {
    p50: percentile(0.5),
    p95: percentile(0.95),
    samples: sorted.length,
  },
  negativeAuth: "pass",
  operations: ops,
  publicCors: "pass",
  supabaseHost: new URL(supabaseUrl).hostname,
};

console.info(JSON.stringify(report, null, 2));
