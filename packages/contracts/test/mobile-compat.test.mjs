import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  apiRoutes,
  errorEnvelopeSchema,
  safetyStatusFixture,
  safetyStatusSchema,
} from "../src/v1.ts";

test("v1 safety status remains compatible with the mobile adapter", () => {
  assert.deepEqual(
    safetyStatusSchema.parse(safetyStatusFixture),
    safetyStatusFixture,
  );

  const mobileContract = readFileSync(
    new URL(
      "../../../apps/mobile/src/features/check-in/types.ts",
      import.meta.url,
    ),
    "utf8",
  );
  for (const requiredLiteral of [
    "z.literal(24)",
    "z.literal(36)",
    "z.literal(48)",
    "serverTime",
    "nextDeadlineAt",
  ]) {
    assert.match(
      mobileContract,
      new RegExp(requiredLiteral.replace(/[()]/g, "\\$&")),
    );
  }
});

test("v1 route families retain the mobile paths", () => {
  assert.equal(apiRoutes.checkIns, "/v1/check-ins");
  assert.equal(apiRoutes.devices, "/v1/me/devices");
  assert.equal(apiRoutes.profile, "/v1/me");
  assert.equal(apiRoutes.safetyPlan, "/v1/safety-plan");
  assert.equal(apiRoutes.safetyPlanStatus, "/v1/safety-plan/status");
  assert.equal(apiRoutes.trustedContacts, "/v1/trusted-contacts");
  assert.equal(apiRoutes.alertCurrent, "/v1/alerts/current");
  assert.equal(apiRoutes.history, "/v1/history");
});

test("stable errors include the correlation request id", () => {
  const value = errorEnvelopeSchema.parse({
    error: {
      code: "NOT_FOUND",
      message: "Không tìm thấy tài nguyên.",
      requestId: "request-1",
      retryable: false,
    },
  });
  assert.equal(value.error.requestId, "request-1");
});
