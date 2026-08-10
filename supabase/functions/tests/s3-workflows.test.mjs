import assert from "node:assert/strict";
import test from "node:test";

import { createApiRouter } from "../_shared/api-router.ts";
import { createNotificationDispatcher } from "../_shared/notification-dispatcher.ts";
import {
  ExpoPushProvider,
  FakeProvider,
  GmailSmtpEmailProvider,
  getExpoReceipts,
  ResendEmailProvider,
} from "../_shared/notification-providers.ts";
import { renderNotification } from "../_shared/notification-templates.ts";
import { createOpsRouter } from "../_shared/ops-router.ts";
import { createPublicApiRouter } from "../_shared/public-api-router.ts";
import { FakeClock } from "../_shared/testing/fakes.ts";

const now = new Date("2026-08-04T00:00:00.000Z");
const clock = new FakeClock(now);
const actor = {
  authTimeSeconds: Math.floor(now.getTime() / 1000),
  role: "authenticated",
  userId: "11111111-1111-4111-8111-111111111111",
};
const allowRateLimiter = async () => ({
  allowed: true,
  limit: 100,
  remaining: 99,
  retryAt: "2026-08-04T00:05:00.000Z",
});

const database = (handler) => {
  const calls = [];
  return {
    calls,
    gateway: {
      async call(name, parameters) {
        calls.push({ name, parameters });
        return handler(name, parameters);
      },
    },
  };
};

test("contact mutation unwraps the safe projection and dispatches after commit", async () => {
  const db = database(() => ({
    dispatch: { deliveryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    projection: { contacts: [], maxContacts: 3, serverTime: now.toISOString() },
  }));
  const dispatched = [];
  const response = await createApiRouter({
    authorize: () => actor,
    clock,
    database: db.gateway,
    dispatcher: {
      async dispatch(id) {
        dispatched.push(id);
        return 1;
      },
    },
    rateLimiter: allowRateLimiter,
  })(
    new Request("http://local/functions/v1/api/v1/trusted-contacts", {
      body: JSON.stringify({
        consentConfirmed: true,
        displayName: "Lan",
        email: "lan@example.test",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    contacts: [],
    maxContacts: 3,
    serverTime: now.toISOString(),
  });
  assert.deepEqual(dispatched, ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  assert.equal(db.calls[0].name, "internal_create_trusted_contact");
});

test("atomic reorder forwards the complete UUID order", async () => {
  const ids = [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ];
  const db = database(() => ({
    contacts: [],
    maxContacts: 3,
    serverTime: now.toISOString(),
  }));
  const response = await createApiRouter({
    authorize: () => actor,
    clock,
    database: db.gateway,
    rateLimiter: allowRateLimiter,
  })(
    new Request("http://local/v1/trusted-contacts/reorder", {
      body: JSON.stringify({ orderedContactIds: ids }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(db.calls[0].parameters.p_ordered_contact_ids, ids);
});

test("S3 routes distinguish invalid input from unsupported methods", async () => {
  const db = database(() => ({}));
  const router = createApiRouter({
    authorize: () => actor,
    clock,
    database: db.gateway,
    rateLimiter: allowRateLimiter,
  });
  const invalid = await router(
    new Request("http://local/v1/trusted-contacts", {
      body: JSON.stringify({ displayName: "Lan" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_REQUEST");

  const unsupported = await router(
    new Request("http://local/v1/trusted-contacts", {
      method: "PUT",
    }),
  );
  assert.equal(unsupported.status, 405);
  assert.equal((await unsupported.json()).error.code, "METHOD_NOT_ALLOWED");
});

test("sensitive account workflow requires a recent verified JWT", async () => {
  const db = database(() => ({}));
  const response = await createApiRouter({
    authorize: () => ({
      ...actor,
      authTimeSeconds: actor.authTimeSeconds - 901,
    }),
    clock,
    database: db.gateway,
    rateLimiter: allowRateLimiter,
  })(
    new Request("http://local/v1/account/deletion-requests", {
      body: "{}",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "delete-1",
      },
      method: "POST",
    }),
  );
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "REAUTHENTICATION_REQUIRED");
  assert.equal(db.calls.length, 0);
});

test("public invitation GET is projection-only and emits privacy headers", async () => {
  const db = database((name) => {
    assert.equal(name, "internal_get_public_invitation");
    return {
      allowedActions: ["accept", "decline"],
      serverTime: now.toISOString(),
      status: "pending",
    };
  });
  const token = "a".repeat(43);
  const response = await createPublicApiRouter({
    allowedOrigins: ["https://contacts.example.test"],
    clock,
    database: db.gateway,
    rateLimiter: allowRateLimiter,
  })(
    new Request(`http://local/v1/public/invitations/${token}`, {
      headers: { origin: "https://contacts.example.test" },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal(db.calls.length, 1);
});

test("public POST scopes actions and rejects an untrusted browser origin", async () => {
  const db = database(() => ({
    serverTime: now.toISOString(),
    status: "accepted",
  }));
  const token = "b".repeat(43);
  const router = createPublicApiRouter({
    allowedOrigins: ["https://contacts.example.test"],
    clock,
    database: db.gateway,
    rateLimiter: allowRateLimiter,
  });
  const forbidden = await router(
    new Request(`http://local/v1/public/invitations/${token}`, {
      headers: { origin: "https://evil.example" },
    }),
  );
  assert.equal(forbidden.status, 403);
  const invalidAction = await router(
    new Request(`http://local/v1/public/invitations/${token}`, {
      body: JSON.stringify({ action: "resolve", idempotencyKey: "attempt-1" }),
      headers: {
        "content-type": "application/json",
        origin: "https://contacts.example.test",
      },
      method: "POST",
    }),
  );
  assert.equal(invalidAction.status, 400);
  assert.equal(db.calls.length, 0);
});

test("dispatcher persists transient, permanent and unknown provider outcomes", async () => {
  for (const kind of ["transient", "permanent", "unknown"]) {
    const db = database((name) =>
      name === "internal_claim_notification_deliveries"
        ? [
            {
              attemptCount: 1,
              channel: "email",
              id: `delivery-${kind}`,
              idempotencyKey: `key-${kind}`,
              payload: { ownerDisplayName: "An" },
              publicToken: "t".repeat(43),
              recipientRef: "contact@example.test",
              templateKey: "trusted-contact-alert",
              templateVersion: 1,
            },
          ]
        : "recorded",
    );
    const provider = new FakeProvider("email", { kind, errorCode: "TEST" });
    await createNotificationDispatcher(
      db.gateway,
      new Map([["email", provider]]),
      "https://contacts.example.test",
    ).dispatch();
    assert.equal(db.calls[1].name, "internal_record_notification_outcome");
    assert.equal(db.calls[1].parameters.p_outcome, kind);
  }
});

test("fake provider deduplicates a stable delivery key", async () => {
  const provider = new FakeProvider("email");
  const message = {
    body: "body",
    channel: "email",
    idempotencyKey: "same-key",
    recipient: "fake@example.test",
    subject: "subject",
    title: "title",
  };
  await provider.send(message);
  await provider.send(message);
  assert.equal(provider.sent.size, 1);
});

test("versioned email templates escape user-controlled display names", () => {
  const rendered = renderNotification({
    payload: { ownerDisplayName: "<img src=x onerror=alert(1)>" },
    publicToken: "safe-token",
    publicWebUrl: "https://contacts.example.test",
    templateKey: "trusted-contact-invitation",
    templateVersion: 1,
  });
  assert.doesNotMatch(rendered.html, /<img/);
  assert.match(rendered.html, /&lt;img/);
  assert.throws(
    () =>
      renderNotification({
        payload: {},
        publicWebUrl: "https://contacts.example.test",
        templateKey: "trusted-contact-invitation",
        templateVersion: 2,
      }),
    /UNKNOWN_TEMPLATE_VERSION/,
  );
});

test("Resend adapter sends a stable provider idempotency key", async () => {
  const requests = [];
  const provider = new ResendEmailProvider(
    "test-key",
    "I’m Okay <test@example.test>",
    async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
    },
  );
  const outcome = await provider.send({
    body: "body",
    channel: "email",
    html: "<p>body</p>",
    idempotencyKey: "delivery-1",
    recipient: "contact@example.test",
    subject: "subject",
    title: "title",
  });
  assert.equal(outcome.kind, "sent");
  assert.equal(requests[0].init.headers["idempotency-key"], "delivery-1");
});

test("Gmail SMTP adapter uses a stable hashed Message-ID", async () => {
  const requests = [];
  const provider = new GmailSmtpEmailProvider(
    "I’m Okay <sender@gmail.com>",
    async (options) => {
      requests.push(options);
      return { accepted: [options.to], messageId: options.messageId };
    },
  );
  const message = {
    body: "body",
    channel: "email",
    html: "<p>body</p>",
    idempotencyKey: "delivery-1",
    recipient: "contact@example.test",
    subject: "subject",
    title: "title",
  };

  const first = await provider.send(message);
  const second = await provider.send(message);

  assert.equal(first.kind, "sent");
  assert.deepEqual(second, first);
  assert.equal(requests[0].messageId, requests[1].messageId);
  assert.match(
    requests[0].messageId,
    /^<imokay-[a-f0-9]{64}@imokay\.invalid>$/,
  );
  assert.match(
    requests[0].headers["X-Im-Okay-Delivery-Hash"],
    /^[a-f0-9]{64}$/,
  );
  assert.doesNotMatch(JSON.stringify(requests[0]), /delivery-1/);
});

test("Gmail SMTP adapter classifies retry and permanent failures", async () => {
  const message = {
    body: "body",
    channel: "email",
    idempotencyKey: "delivery-2",
    recipient: "contact@example.test",
    subject: "subject",
    title: "title",
  };
  const failingProvider = (error) =>
    new GmailSmtpEmailProvider("sender@gmail.com", async () => {
      throw error;
    });

  assert.deepEqual(await failingProvider({ responseCode: 451 }).send(message), {
    kind: "transient",
    errorCode: "SMTP_451",
  });
  assert.deepEqual(await failingProvider({ responseCode: 550 }).send(message), {
    kind: "permanent",
    errorCode: "SMTP_550",
  });
  assert.deepEqual(await failingProvider({ code: "EAUTH" }).send(message), {
    kind: "permanent",
    errorCode: "SMTP_AUTH_FAILED",
  });
  assert.deepEqual(await failingProvider({ code: "ETIMEDOUT" }).send(message), {
    kind: "unknown",
    errorCode: "SMTP_OUTCOME_UNKNOWN",
  });
});

test("Gmail SMTP adapter rejects an unaccepted recipient", async () => {
  const provider = new GmailSmtpEmailProvider(
    "sender@gmail.com",
    async (options) => ({ rejected: [options.to] }),
  );
  const outcome = await provider.send({
    body: "body",
    channel: "email",
    idempotencyKey: "delivery-3",
    recipient: "contact@example.test",
    subject: "subject",
    title: "title",
  });

  assert.deepEqual(outcome, {
    kind: "permanent",
    errorCode: "SMTP_RECIPIENT_REJECTED",
  });
});

test("Expo ticket and receipt adapters preserve DeviceNotRegistered", async () => {
  const push = new ExpoPushProvider(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            details: { error: "DeviceNotRegistered" },
            message: "redacted",
            status: "error",
          },
        }),
        { status: 200 },
      ),
  );
  const ticket = await push.send({
    body: "body",
    channel: "push",
    idempotencyKey: "push-1",
    recipient: "ExponentPushToken[test]",
    subject: "subject",
    title: "title",
  });
  assert.deepEqual(ticket, {
    kind: "permanent",
    errorCode: "DeviceNotRegistered",
  });
  const receipts = await getExpoReceipts(
    ["receipt-1"],
    async () =>
      new Response(
        JSON.stringify({
          data: {
            "receipt-1": {
              details: { error: "DeviceNotRegistered" },
              status: "error",
            },
          },
        }),
        { status: 200 },
      ),
  );
  assert.deepEqual(receipts.get("receipt-1"), {
    status: "error",
    errorCode: "DeviceNotRegistered",
  });
});

test("authenticated mutations stop before domain work when rate limited", async () => {
  const db = database(() => {
    throw new Error("domain call must not run");
  });
  const response = await createApiRouter({
    authorize: () => actor,
    clock,
    database: db.gateway,
    rateLimiter: async () => ({
      allowed: false,
      limit: 4,
      remaining: 0,
      retryAt: "2026-08-04T00:10:00.000Z",
    }),
  })(
    new Request("http://local/v1/alerts/sos", {
      headers: { "idempotency-key": "sos-rate-limited" },
      method: "POST",
    }),
  );
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, "SOS_RATE_LIMITED");
  assert.equal(db.calls.length, 0);
});

test("public rate limiting preserves privacy headers and generic errors", async () => {
  const db = database(() => {
    throw new Error("token projection must not run");
  });
  const response = await createPublicApiRouter({
    allowedOrigins: ["https://contacts.example.test"],
    clock,
    database: db.gateway,
    rateLimiter: async () => ({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAt: "2026-08-04T00:05:00.000Z",
    }),
  })(
    new Request(`http://local/v1/public/alerts/${"c".repeat(43)}`, {
      headers: { origin: "https://contacts.example.test" },
      method: "GET",
    }),
  );
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal((await response.json()).error.code, "RATE_LIMITED");
  assert.equal(db.calls.length, 0);
});

test("notification kill switch leaves delivery work unclaimed", async () => {
  const db = database(() => {
    throw new Error("claim must not run while disabled");
  });
  const dispatched = await createNotificationDispatcher(
    db.gateway,
    new Map([["email", new FakeProvider("email")]]),
    "https://contacts.example.test",
    false,
  ).dispatch();
  assert.equal(dispatched, 0);
  assert.equal(db.calls.length, 0);
});

test("ops snapshot requires the internal secret and returns only aggregate signals", async () => {
  const snapshot = {
    serverTime: now.toISOString(),
    scheduler: { heartbeatAgeSeconds: 12 },
    queue: { depth: 0 },
    deliveries: { deadLetter: 0 },
  };
  const db = database(() => snapshot);
  const router = createOpsRouter({
    database: db.gateway,
    internalSecret: "ops-test-secret",
  });
  const denied = await router(new Request("http://local/ops"));
  assert.equal(denied.status, 401);
  const accepted = await router(
    new Request("http://local/ops", {
      headers: { "x-internal-function-secret": "ops-test-secret" },
    }),
  );
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), snapshot);
  assert.equal(db.calls[0].name, "internal_get_operational_snapshot");
  assert.doesNotMatch(JSON.stringify(snapshot), /email|recipient|token/i);
});
