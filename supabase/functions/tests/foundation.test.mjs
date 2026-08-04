import assert from "node:assert/strict";
import test from "node:test";

import { createApiRouter } from "../_shared/api-router.ts";
import { parseJson } from "../_shared/http.ts";
import { sanitizeLogValue } from "../_shared/logger.ts";
import { createPublicApiRouter } from "../_shared/public-api-router.ts";
import {
  FakeClock,
  FakeNotificationProvider,
} from "../_shared/testing/fakes.ts";

const instant = new Date("2026-08-04T00:00:00.000Z");
const clock = new FakeClock(instant);

test("authenticated router rejects missing user context", async () => {
  const response = await createApiRouter({
    authorize: () => null,
    clock,
  })(new Request("http://local.test/api/v1/health"));
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error.code, "UNAUTHENTICATED");
  assert.equal(body.error.requestId, response.headers.get("x-request-id"));
});

test("authenticated and public health routers expose the v1 contract", async () => {
  const authenticated = await createApiRouter({
    authorize: () => ({ role: "authenticated", userId: "user-1" }),
    clock,
  })(
    new Request("http://local.test/functions/v1/api/v1/health", {
      headers: { "x-request-id": "request-1" },
    }),
  );
  const publicResponse = await createPublicApiRouter({ clock })(
    new Request("http://local.test/functions/v1/public-api/v1/health"),
  );

  assert.deepEqual(await authenticated.json(), {
    contractVersion: "v1",
    serverTime: instant.toISOString(),
    service: "api",
    status: "ok",
  });
  assert.equal(authenticated.headers.get("cache-control"), "no-store");
  assert.equal(authenticated.headers.get("x-request-id"), "request-1");
  assert.equal((await publicResponse.json()).service, "public-api");
});

test("shared JSON validation rejects a body outside the schema", async () => {
  const schema = {
    safeParse: (value) =>
      typeof value === "object" && value !== null && value.ok === true
        ? { success: true, data: value }
        : { success: false },
  };
  await assert.rejects(
    parseJson(
      new Request("http://local.test", {
        body: JSON.stringify({ ok: false }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      schema,
    ),
    /INVALID_JSON_BODY/,
  );
});

test("structured logging removes secrets and public tokens", () => {
  assert.deepEqual(
    sanitizeLogValue({
      authorization: "Bearer secret",
      nested: { emailBody: "private", ok: true },
      url: "https://example.test/invitations/token-value?token=query-value",
    }),
    {
      authorization: "[REDACTED]",
      nested: { emailBody: "[REDACTED]", ok: true },
      url: "https://example.test/invitations/[REDACTED]",
    },
  );
});

test("fake provider is local-only and idempotent", async () => {
  const provider = new FakeNotificationProvider("email");
  const message = {
    channel: "email",
    idempotencyKey: "invitation:1",
    recipientRef: "fake-recipient-1",
    templateKey: "invitation-v1",
  };
  await provider.send(message);
  await provider.send(message);
  assert.equal(provider.sent.length, 1);
  clock.advance(60_000);
  assert.equal(clock.now().toISOString(), "2026-08-04T00:01:00.000Z");
});
