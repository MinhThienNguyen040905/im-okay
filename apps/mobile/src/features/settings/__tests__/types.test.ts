import { isIanaTimezone, settingsProjectionSchema } from "../types";

export const settingsProjection = {
  serverTime: "2026-08-02T12:00:00.000Z",
  profile: {
    displayName: "Minh Anh",
    email: "minh@example.test",
    timezone: "Asia/Ho_Chi_Minh",
  },
  safetyPlan: {
    state: "active" as const,
    intervalHours: 36 as const,
    nextDeadlineAt: "2026-08-04T00:00:00.000Z",
    snoozedUntil: null,
  },
  contacts: { totalCount: 2, acceptedCount: 1 },
  push: { registration: "registered" as const },
  account: { exportRequest: null, deletionRequest: null },
  allowedActions: {
    canUpdateProfile: true,
    canUpdateSafetyPlan: true,
    canDisableSafetyPlan: true,
    canRequestExport: true,
    canRequestDeletion: true,
  },
};

describe("settings projection contract", () => {
  it("validates IANA timezone and authoritative deadline", () => {
    expect(isIanaTimezone("Asia/Ho_Chi_Minh")).toBe(true);
    expect(isIanaTimezone("GMT+7-ish")).toBe(false);
    expect(settingsProjectionSchema.parse(settingsProjection).safetyPlan.nextDeadlineAt).toBeTruthy();
  });

  it("rejects an inactive plan that still has a deadline", () => {
    expect(() =>
      settingsProjectionSchema.parse({
        ...settingsProjection,
        safetyPlan: { ...settingsProjection.safetyPlan, state: "inactive" },
      }),
    ).toThrow();
  });

  it("rejects provider details added to push status", () => {
    expect(() =>
      settingsProjectionSchema.parse({
        ...settingsProjection,
        push: { ...settingsProjection.push, providerToken: "secret" },
      }),
    ).toThrow();
  });
});
