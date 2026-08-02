import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { createCheckInApi } from "@/features/check-in/api";

import { createAlertsApi } from "../api";
import { AlertsApiError } from "../types";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
const randomUUID = jest.mocked(Crypto.randomUUID);

const session = {
  accessToken: "fixture-token",
  user: { id: "fixture-alert-user", email: "fixture@example.test" },
};
const key = `imokay.fixture.server.${session.user.id}.v1`;

const seed = async (withAcceptedContact = true, deadlineHours = 1) => {
  const nowMs = Date.parse("2026-08-02T00:00:00.000Z");
  await AsyncStorage.setItem(
    key,
    JSON.stringify({
      safetyPlan: { intervalHours: 36 },
      status: {
        serverTime: new Date(nowMs).toISOString(),
        plan: {
          state: "active",
          intervalHours: 36,
          lastCheckInAt: new Date(nowMs - 35 * 60 * 60_000).toISOString(),
          nextDeadlineAt: new Date(
            nowMs + deadlineHours * 60 * 60_000,
          ).toISOString(),
        },
        contactSummary: { confirmedCount: withAcceptedContact ? 1 : 0 },
        currentAlert: { id: "warning-1", state: "warning" },
        lastAlertOutcome: null,
      },
      trustedContacts: withAcceptedContact
        ? [
            {
              id: "contact-1",
              displayName: "Lan",
              email: "lan@example.test",
              priority: 1,
              invitation: {
                status: "accepted",
                sentAt: "2026-08-01T00:00:00.000Z",
                expiresAt: null,
                resendAvailableAt: null,
              },
            },
          ]
        : [],
    }),
  );
};

describe("local alerts fixture", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
    let sequence = 0;
    randomUUID.mockReset();
    randomUUID.mockImplementation(
      () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    );
  });

  afterEach(() => jest.useRealTimers());

  it("returns exact server deadline and accepted-contact eligibility", async () => {
    await seed();
    const result = await createAlertsApi(session).getContext();
    expect(result.projection.plan.nextDeadlineAt).toBe(
      "2026-08-02T01:00:00.000Z",
    );
    expect(result.projection.currentAlert).toEqual(
      expect.objectContaining({ source: "deadline", state: "warning" }),
    );
    expect(result.projection.contactSummary).toEqual(
      expect.objectContaining({ eligibleCount: 1, firstContactName: "Lan" }),
    );
  });

  it("returns authoritative snoozedUntil for finite duration", async () => {
    await seed();
    const result = await createAlertsApi(session).snooze(4, "snooze-key");
    expect(result.projection.plan).toEqual(
      expect.objectContaining({
        state: "snoozed",
        snoozedUntil: "2026-08-02T04:00:00.000Z",
      }),
    );
  });

  it("replays SOS by idempotency key and keeps source distinct", async () => {
    await seed();
    const api = createAlertsApi(session);
    const first = await api.sendSos("same-key");
    const replay = await api.sendSos("same-key");
    expect(replay.projection.currentAlert?.id).toBe(
      first.projection.currentAlert?.id,
    );
    expect(replay.projection.currentAlert).toEqual(
      expect.objectContaining({
        source: "sos",
        delivery: expect.objectContaining({ status: "queued" }),
      }),
    );
  });

  it("queues correction when check-in happens after SOS was accepted", async () => {
    await seed();
    await createAlertsApi(session).sendSos("sos-key");
    const checkIn = await createCheckInApi(session).checkIn("check-in-key");
    expect(checkIn.status.lastAlertOutcome).toEqual(
      expect.objectContaining({
        result: "correction_queued",
        correctionStatus: "queued",
      }),
    );
    const context = await createAlertsApi(session).getContext();
    expect(context.projection.currentAlert).toEqual(
      expect.objectContaining({
        state: "resolved",
        correction: expect.objectContaining({ status: "queued" }),
      }),
    );
  });

  it("rejects SOS when no contact has accepted", async () => {
    await seed(false);
    await expect(createAlertsApi(session).sendSos("sos-key")).rejects.toEqual(
      expect.objectContaining<Partial<AlertsApiError>>({
        code: "NO_ELIGIBLE_CONTACTS",
      }),
    );
  });

  it("creates a separately labeled drill when no alert is active", async () => {
    await seed(true, 6);
    const stored = JSON.parse((await AsyncStorage.getItem(key))!) as {
      status: { currentAlert: unknown };
    };
    stored.status.currentAlert = null;
    await AsyncStorage.setItem(key, JSON.stringify(stored));
    const result = await createAlertsApi(session).sendDrill("drill-key");
    expect(result.projection.currentAlert).toEqual(
      expect.objectContaining({ source: "drill", state: "triggered" }),
    );
  });
});
