import assert from "node:assert/strict";
import test from "node:test";

import { createApiRouter } from "../_shared/api-router.ts";
import { DatabaseError } from "../_shared/database.ts";
import { FakeClock } from "../_shared/testing/fakes.ts";

const actor = {
  role: "authenticated",
  userId: "11111111-1111-4111-8111-111111111111",
};
const clock = new FakeClock(new Date("2026-08-04T00:00:00.000Z"));
const allowRateLimiter = async () => ({
  allowed: true,
  limit: 100,
  remaining: 99,
  retryAt: "2026-08-04T00:01:00.000Z",
});

const createDatabase = (result) => {
  const calls = [];
  return {
    calls,
    gateway: {
      async call(name, parameters) {
        calls.push({ name, parameters });
        if (result instanceof Error) throw result;
        return result;
      },
    },
  };
};

const router = (database) =>
  createApiRouter({
    authorize: () => actor,
    clock,
    database,
    rateLimiter: allowRateLimiter,
  });

test("status route calls only the internal actor-scoped projection", async () => {
  const projection = {
    serverTime: clock.now().toISOString(),
    plan: { state: "inactive" },
  };
  const database = createDatabase(projection);
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/safety-plan/status"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), projection);
  assert.deepEqual(database.calls, [
    {
      name: "internal_get_safety_status",
      parameters: { p_actor_user_id: actor.userId },
    },
  ]);
});

test("check-in forwards the stable key and never accepts an actor from JSON", async () => {
  const database = createDatabase({ accepted: true });
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/check-ins", {
      body: JSON.stringify({ source: "mobile", userId: "attacker" }),
      headers: {
        "content-type": "application/json",
        "idempotency-key": "check-in-attempt-1",
      },
      method: "POST",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(database.calls[0].name, "internal_perform_check_in");
  assert.equal(database.calls[0].parameters.p_actor_user_id, actor.userId);
  assert.equal(
    database.calls[0].parameters.p_idempotency_key,
    "check-in-attempt-1",
  );
  assert.equal(database.calls[0].parameters.p_source, "mobile");
  assert.match(
    database.calls[0].parameters.p_correlation_id,
    /^[0-9a-f-]{36}$/,
  );
});

test("check-in rejects a missing idempotency key before database access", async () => {
  const database = createDatabase({ accepted: true });
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/check-ins", {
      body: JSON.stringify({ source: "mobile" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  assert.equal(database.calls.length, 0);
});

test("profile route validates the request and preserves the caller identity", async () => {
  const database = createDatabase({ profile: { displayName: "An" } });
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/me", {
      body: JSON.stringify({
        displayName: "An",
        timezone: "Asia/Ho_Chi_Minh",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(database.calls[0], {
    name: "internal_update_profile",
    parameters: {
      p_actor_user_id: actor.userId,
      p_correlation_id: database.calls[0].parameters.p_correlation_id,
      p_display_name: "An",
      p_timezone: "Asia/Ho_Chi_Minh",
    },
  });
});

test("account-disabled database state maps to a stable non-retryable error", async () => {
  const database = createDatabase(new DatabaseError("ACCOUNT_DISABLED"));
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/safety-plan/status"),
  );
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "ACCOUNT_DISABLED");
  assert.equal(body.error.retryable, false);
  assert.equal(body.error.requestId, response.headers.get("x-request-id"));
});

test("known route with an unsupported method returns 405", async () => {
  const database = createDatabase({});
  const response = await router(database.gateway)(
    new Request("http://local.test/functions/v1/api/v1/safety-plan/status", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 405);
  assert.equal((await response.json()).error.code, "METHOD_NOT_ALLOWED");
  assert.equal(database.calls.length, 0);
});
