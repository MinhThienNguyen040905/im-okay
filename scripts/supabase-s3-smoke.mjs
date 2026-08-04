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
  for (const key of keys)
    if (typeof status[key] === "string" && status[key]) return status[key];
  throw new Error(`Supabase status thiếu ${keys.join("/")}.`);
};
const assertStatus = async (response, expected = 200) => {
  if (response.status !== expected)
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
};

const baseUrl = readStatus("API_URL", "api_url").replace(/\/$/, "");
const publishableKey = readStatus(
  "ANON_KEY",
  "PUBLISHABLE_KEY",
  "anon_key",
  "publishable_key",
);
const serviceRoleKey = readStatus("SERVICE_ROLE_KEY", "service_role_key");
const authResponse = await fetch(
  `${baseUrl}/auth/v1/token?grant_type=password`,
  {
    body: JSON.stringify({
      email: "an@example.test",
      password: "local-demo-password",
    }),
    headers: { apikey: publishableKey, "content-type": "application/json" },
    method: "POST",
  },
);
await assertStatus(authResponse);
const auth = await authResponse.json();
const userId = auth.user.id;
const apiHeaders = {
  apikey: publishableKey,
  authorization: `Bearer ${auth.access_token}`,
  "content-type": "application/json",
};
const internalHeaders = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
};
const api = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}/functions/v1/api/v1${route}`, {
    ...options,
    headers: { ...apiHeaders, ...options.headers },
  });
  await assertStatus(response, options.expectedStatus ?? 200);
  return response.json();
};
const publicApi = async (kind, token, options = {}) => {
  const response = await fetch(
    `${baseUrl}/functions/v1/public-api/v1/public/${kind}/${encodeURIComponent(token)}`,
    {
      ...options,
      headers: { apikey: publishableKey, ...options.headers },
    },
  );
  await assertStatus(response);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  return response.json();
};
const rpc = async (name, body) => {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, {
    body: JSON.stringify(body),
    headers: internalHeaders,
    method: "POST",
  });
  await assertStatus(response);
  return response.json();
};

await api("/me", {
  body: JSON.stringify({ displayName: "An S3", timezone: "Asia/Ho_Chi_Minh" }),
  method: "PATCH",
});
const createdBundle = await rpc("internal_create_trusted_contact", {
  p_actor_user_id: userId,
  p_consent_confirmed: true,
  p_correlation_id: crypto.randomUUID(),
  p_display_name: "Lan",
  p_email: "lan-s3@example.test",
});
const created = createdBundle.projection;
assert.equal(created.contacts.length, 1);
assert.equal(created.contacts[0].invitation.status, "pending");
const contactId = created.contacts[0].id;
const [invitationClaim] = await rpc("internal_claim_notification_deliveries", {
  p_batch_size: 1,
  p_delivery_id: createdBundle.dispatch.deliveryId,
});
const invitationToken = invitationClaim.publicToken;
const firstGet = await publicApi("invitations", invitationToken);
const secondGet = await publicApi("invitations", invitationToken);
assert.deepEqual(
  { ...secondGet, serverTime: undefined },
  { ...firstGet, serverTime: undefined },
);
const accepted = await publicApi("invitations", invitationToken, {
  body: JSON.stringify({
    action: "accept",
    idempotencyKey: `accept:${crypto.randomUUID()}`,
  }),
  headers: { "content-type": "application/json" },
  method: "POST",
});
assert.equal(accepted.status, "accepted");
assert.equal((await api("/me/settings")).contacts.acceptedCount, 1);
const apiCreated = await api("/trusted-contacts", {
  body: JSON.stringify({
    consentConfirmed: true,
    displayName: "Minh",
    email: "minh-s3@example.test",
  }),
  method: "POST",
});
assert.equal(apiCreated.contacts.length, 2);
const secondContactId = apiCreated.contacts.find(
  ({ id }) => id !== contactId,
).id;
assert.equal(
  (
    await api("/trusted-contacts/reorder", {
      body: JSON.stringify({ orderedContactIds: [secondContactId, contactId] }),
      method: "POST",
    })
  ).contacts[0].id,
  secondContactId,
);

await api("/safety-plan", {
  body: JSON.stringify({ checkInIntervalHours: 36 }),
  method: "PUT",
});
const sosBundle = await rpc("internal_start_alert", {
  p_actor_user_id: userId,
  p_correlation_id: crypto.randomUUID(),
  p_idempotency_key: `sos:${crypto.randomUUID()}`,
  p_source: "sos",
});
const sos = sosBundle.projection;
assert.equal(sos.currentAlert.source, "sos");
assert.equal(sos.currentAlert.state, "triggered");
const alertId = sos.currentAlert.id;
const [alertClaim] = await rpc("internal_claim_notification_deliveries", {
  p_batch_size: 1,
  p_delivery_id: sosBundle.dispatch.deliveryId,
});
const alertToken = alertClaim.publicToken;
assert.equal(
  await rpc("internal_record_notification_outcome", {
    p_delivery_id: sosBundle.dispatch.deliveryId,
    p_error_code: null,
    p_outcome: "sent",
    p_provider: "fake",
    p_provider_message_id: `fake:${sosBundle.dispatch.deliveryId}`,
  }),
  "sent",
);
assert.equal(
  (await api("/alerts/current")).currentAlert.delivery.status,
  "sent",
);
assert.equal((await publicApi("alerts", alertToken)).status, "active");
assert.equal(
  (
    await publicApi("alerts", alertToken, {
      body: JSON.stringify({
        action: "acknowledge",
        idempotencyKey: `ack:${crypto.randomUUID()}`,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  ).status,
  "active",
);
assert.equal(
  (
    await publicApi("alerts", alertToken, {
      body: JSON.stringify({
        action: "resolve",
        idempotencyKey: `resolve:${crypto.randomUUID()}`,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  ).status,
  "resolved",
);

const history = await api("/history?limit=20");
assert.ok(
  history.items.some(({ event }) => event === "contact_response_received"),
);
const exportState = await api("/account/export-requests", {
  body: "{}",
  headers: { "idempotency-key": `export:${crypto.randomUUID()}` },
  method: "POST",
});
assert.equal(exportState.account.exportRequest.status, "requested");

console.info(
  "Supabase S3 contact → invitation → fake delivery → SOS → public response smoke passed.",
);
