import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";

const cliEntrypoint = path.resolve(
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);

const status = JSON.parse(
  execFileSync(process.execPath, [cliEntrypoint, "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);

const readStatus = (...keys) => {
  for (const key of keys) {
    if (typeof status[key] === "string" && status[key].length > 0) {
      return status[key];
    }
  }
  throw new Error(`Supabase status thiếu ${keys.join("/")}.`);
};

const assertStatus = async (response, expected) => {
  if (response.status !== expected) {
    throw new Error(
      `Expected HTTP ${expected}, received ${response.status}: ${await response.text()}`,
    );
  }
};

const apiUrl = readStatus("API_URL", "api_url").replace(/\/$/, "");
const publishableKey = readStatus(
  "ANON_KEY",
  "PUBLISHABLE_KEY",
  "anon_key",
  "publishable_key",
);

const authResponse = await fetch(
  `${apiUrl}/auth/v1/token?grant_type=password`,
  {
    body: JSON.stringify({
      email: "an@example.test",
      password: "local-demo-password",
    }),
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    method: "POST",
  },
);
await assertStatus(authResponse, 200);
const auth = await authResponse.json();
assert.equal(typeof auth.access_token, "string");

const publicHealth = await fetch(
  `${apiUrl}/functions/v1/public-api/v1/health`,
  { headers: { apikey: publishableKey } },
);
await assertStatus(publicHealth, 200);
assert.deepEqual(
  (({ contractVersion, service, status: healthStatus }) => ({
    contractVersion,
    service,
    status: healthStatus,
  }))(await publicHealth.json()),
  { contractVersion: "v1", service: "public-api", status: "ok" },
);

const unauthenticated = await fetch(`${apiUrl}/functions/v1/api/v1/health`, {
  headers: { apikey: publishableKey },
});
await assertStatus(unauthenticated, 401);

const authenticated = await fetch(`${apiUrl}/functions/v1/api/v1/health`, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${auth.access_token}`,
    "x-request-id": "foundation-smoke",
  },
});
await assertStatus(authenticated, 200);
assert.equal(authenticated.headers.get("x-request-id"), "foundation-smoke");
assert.deepEqual(
  (({ contractVersion, service, status: healthStatus }) => ({
    contractVersion,
    service,
    status: healthStatus,
  }))(await authenticated.json()),
  { contractVersion: "v1", service: "api", status: "ok" },
);

const apiHeaders = {
  apikey: publishableKey,
  authorization: `Bearer ${auth.access_token}`,
  "content-type": "application/json",
};
const smokeRunId = crypto.randomUUID();
const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}/functions/v1/api/v1${path}`, {
    ...options,
    headers: { ...apiHeaders, ...options.headers },
  });
  await assertStatus(response, options.expectedStatus ?? 200);
  return response.json();
};

const onboarding = await apiRequest("/me");
assert.equal(typeof onboarding.profile.displayName, "string");
assert.equal(onboarding.profile.timezone, "Asia/Ho_Chi_Minh");

const profile = await apiRequest("/me", {
  body: JSON.stringify({
    displayName: "An Local",
    timezone: "Asia/Ho_Chi_Minh",
  }),
  method: "PATCH",
});
assert.equal(profile.profile.displayName, "An Local");

const device = await apiRequest("/me/devices", {
  body: JSON.stringify({
    expoPushToken: "ExponentPushToken[local-smoke-device]",
    platform: "android",
  }),
  method: "POST",
});
assert.equal(device.registered, true);

const activated = await apiRequest("/safety-plan", {
  body: JSON.stringify({ checkInIntervalHours: 36 }),
  method: "PUT",
});
assert.equal(activated.safetyPlan.state, "active");
assert.equal(activated.safetyPlan.intervalHours, 36);

const activeStatus = await apiRequest("/safety-plan/status");
assert.equal(activeStatus.plan.state, "active");
assert.equal(typeof activeStatus.plan.nextDeadlineAt, "string");

const checkInOptions = {
  body: JSON.stringify({ source: "mobile" }),
  headers: { "idempotency-key": `smoke-check-in:${smokeRunId}` },
  method: "POST",
};
const [firstCheckIn, concurrentRetry] = await Promise.all([
  apiRequest("/check-ins", checkInOptions),
  apiRequest("/check-ins", checkInOptions),
]);
assert.deepEqual(concurrentRetry, firstCheckIn);
assert.equal(firstCheckIn.plan.state, "active");
assert.equal(typeof firstCheckIn.plan.lastCheckInAt, "string");
assert.equal(typeof firstCheckIn.plan.nextDeadlineAt, "string");

const disabled = await apiRequest("/safety-plan/disable", {
  body: JSON.stringify({ confirmation: "disable_safety_plan" }),
  headers: { "idempotency-key": `smoke-disable:${smokeRunId}` },
  method: "POST",
});
assert.equal(disabled.safetyPlan.state, "inactive");
assert.equal(disabled.safetyPlan.nextDeadlineAt, null);

const inactiveCheckIn = await fetch(`${apiUrl}/functions/v1/api/v1/check-ins`, {
  body: JSON.stringify({ source: "mobile" }),
  headers: {
    ...apiHeaders,
    "idempotency-key": `smoke-inactive:${smokeRunId}`,
  },
  method: "POST",
});
await assertStatus(inactiveCheckIn, 409);
assert.equal((await inactiveCheckIn.json()).error.code, "PLAN_INACTIVE");

console.info(
  "Supabase auth/JWT, onboarding, device, safety plan and concurrent check-in smoke passed.",
);
