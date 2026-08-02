import { alertContextProjectionSchema } from "../types";

export const contextProjection = {
  serverTime: "2026-08-02T00:00:00.000Z",
  plan: {
    state: "active" as const,
    nextDeadlineAt: "2026-08-02T01:00:00.000Z",
    snoozedUntil: null,
  },
  contactSummary: {
    eligibleCount: 1,
    firstContactName: "Lan",
    displayNames: ["Lan"],
  },
  channelSummary: {
    deadline: ["email" as const],
    sos: ["push" as const, "email" as const],
    drill: ["push" as const, "email" as const],
  },
  currentAlert: {
    id: "alert-1",
    source: "deadline" as const,
    state: "warning" as const,
    triggerAt: "2026-08-02T01:00:00.000Z",
    delivery: {
      status: "not_started" as const,
      channels: ["email" as const],
      acceptedAt: null,
    },
    correction: { status: "not_required" as const, requestedAt: null },
  },
  availableActions: {
    canCheckIn: true,
    canSendSos: true,
    canSendDrill: false,
    snoozeDurationsHours: [1, 4, 8] as (1 | 4 | 8)[],
  },
};

describe("alert context contract", () => {
  it("accepts only finite snooze presets", () => {
    expect(alertContextProjectionSchema.parse(contextProjection)).toBeTruthy();
    expect(() =>
      alertContextProjectionSchema.parse({
        ...contextProjection,
        availableActions: {
          ...contextProjection.availableActions,
          snoozeDurationsHours: [1, 24],
        },
      }),
    ).toThrow();
  });

  it("rejects duplicate snooze options and inconsistent contact summary", () => {
    expect(() =>
      alertContextProjectionSchema.parse({
        ...contextProjection,
        contactSummary: {
          eligibleCount: 2,
          firstContactName: "Tuấn",
          displayNames: ["Lan"],
        },
        availableActions: {
          ...contextProjection.availableActions,
          snoozeDurationsHours: [1, 1],
        },
      }),
    ).toThrow();
  });

  it("requires explicit SOS/drill/deadline source", () => {
    expect(() =>
      alertContextProjectionSchema.parse({
        ...contextProjection,
        currentAlert: {
          ...contextProjection.currentAlert,
          source: "real-alert-maybe",
        },
      }),
    ).toThrow();
  });
});
