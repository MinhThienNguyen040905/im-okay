import assert from "node:assert/strict";
import test from "node:test";

import {
  assessProviderReadiness,
  extractSecretNames,
  requiredProviderSecretNames,
} from "../staging-provider-readiness.mjs";

test("extractSecretNames ignores provider secret values", () => {
  const records = [
    { name: "GMAIL_SMTP_APP_PASSWORD", value: "must-never-appear-in-report" },
    { name: "GMAIL_SMTP_FROM", value: "sender@gmail.com" },
  ];

  const names = extractSecretNames(records);

  assert.deepEqual([...names], ["GMAIL_SMTP_APP_PASSWORD", "GMAIL_SMTP_FROM"]);
  assert.doesNotMatch(JSON.stringify([...names]), /must-never|sender@gmail/);
});

test("readiness reports missing secret names and consent confirmations", () => {
  const result = assessProviderReadiness({
    deviceConsented: false,
    emailProvider: "gmail_smtp",
    recipientsConsented: false,
    secretNames: new Set(["NOTIFICATION_PROVIDER_MODE"]),
    senderConfirmed: false,
  });

  assert.equal(result.readyForControlledSmoke, false);
  assert.ok(result.missingSecretNames.includes("GMAIL_SMTP_APP_PASSWORD"));
  assert.deepEqual(result.missingConfirmations, [
    "confirmed email sender account",
    "consented test recipients",
    "consented test device",
  ]);
});

test("readiness passes only with every required name and confirmation", () => {
  const result = assessProviderReadiness({
    deviceConsented: true,
    emailProvider: "gmail_smtp",
    recipientsConsented: true,
    secretNames: new Set(requiredProviderSecretNames("gmail_smtp")),
    senderConfirmed: true,
  });

  assert.deepEqual(result, {
    missingConfirmations: [],
    missingSecretNames: [],
    readyForControlledSmoke: true,
  });
});

test("readiness keeps future Resend secrets provider-specific", () => {
  assert.ok(
    requiredProviderSecretNames("gmail_smtp").includes(
      "GMAIL_SMTP_APP_PASSWORD",
    ),
  );
  assert.ok(requiredProviderSecretNames("resend").includes("RESEND_API_KEY"));
  assert.equal(
    requiredProviderSecretNames("gmail_smtp").includes("RESEND_API_KEY"),
    false,
  );
});
