import assert from "node:assert/strict";
import test from "node:test";

import {
  assessProviderReadiness,
  extractSecretNames,
  requiredProviderSecretNames,
} from "../staging-provider-readiness.mjs";

test("extractSecretNames ignores provider secret values", () => {
  const records = [
    { name: "RESEND_API_KEY", value: "must-never-appear-in-report" },
    { name: "RESEND_FROM", value: "sender@example.test" },
  ];

  const names = extractSecretNames(records);

  assert.deepEqual([...names], ["RESEND_API_KEY", "RESEND_FROM"]);
  assert.doesNotMatch(JSON.stringify([...names]), /must-never|sender@example/);
});

test("readiness reports missing secret names and consent confirmations", () => {
  const result = assessProviderReadiness({
    deviceConsented: false,
    recipientsConsented: false,
    secretNames: new Set(["NOTIFICATION_PROVIDER_MODE"]),
    senderVerified: false,
  });

  assert.equal(result.readyForControlledSmoke, false);
  assert.ok(result.missingSecretNames.includes("RESEND_API_KEY"));
  assert.deepEqual(result.missingConfirmations, [
    "verified Resend sender",
    "consented test recipients",
    "consented test device",
  ]);
});

test("readiness passes only with every required name and confirmation", () => {
  const result = assessProviderReadiness({
    deviceConsented: true,
    recipientsConsented: true,
    secretNames: new Set(requiredProviderSecretNames),
    senderVerified: true,
  });

  assert.deepEqual(result, {
    missingConfirmations: [],
    missingSecretNames: [],
    readyForControlledSmoke: true,
  });
});
