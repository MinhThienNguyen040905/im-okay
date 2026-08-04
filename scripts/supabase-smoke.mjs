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

console.info("Supabase auth, JWT negative case and Edge health smoke passed.");
