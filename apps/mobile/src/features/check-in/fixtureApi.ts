import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthSession } from "@/features/auth/types";
import type { AlertContextProjection } from "@/features/alerts/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import {
  safetyStatusSchema,
  type CheckInApi,
  type SafetyStatus,
  type SafetyStatusSnapshot,
} from "./types";

// Local-only fake server for UI development while BA3/BA5 do not exist.
// Deadline calculation must never be imported by the remote/production adapter.
const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;

type FixtureRecord = {
  safetyPlan?: { intervalHours?: 24 | 36 | 48 };
  status?: SafetyStatus;
  checkInResponses?: Record<string, SafetyStatus>;
  alertContext?: AlertContextProjection;
};

const snapshot = (
  status: SafetyStatus,
  startedAtMs: number,
  receivedAtMs: number,
): SafetyStatusSnapshot => ({
  status,
  receivedAtMs,
  clockOffsetMs: calculateServerClockOffset(
    status.serverTime,
    startedAtMs,
    receivedAtMs,
  ),
});

const readFixture = async (userId: string): Promise<FixtureRecord> =>
  JSON.parse((await AsyncStorage.getItem(fixtureKey(userId))) ?? "{}");

const writeFixture = (userId: string, record: FixtureRecord) =>
  AsyncStorage.setItem(fixtureKey(userId), JSON.stringify(record));

const fixtureLocks = new Map<string, Promise<unknown>>();
const serializeFixtureMutation = async <T>(
  userId: string,
  action: () => Promise<T>,
) => {
  const previous = fixtureLocks.get(userId) ?? Promise.resolve();
  const current = previous.then(action, action);
  fixtureLocks.set(userId, current);
  try {
    return await current;
  } finally {
    if (fixtureLocks.get(userId) === current) fixtureLocks.delete(userId);
  }
};

const createInitialStatus = (
  intervalHours: 24 | 36 | 48,
  nowMs: number,
): SafetyStatus => {
  const now = new Date(nowMs).toISOString();
  return {
    serverTime: now,
    plan: {
      state: "active",
      intervalHours,
      lastCheckInAt: now,
      nextDeadlineAt: new Date(
        nowMs + intervalHours * 60 * 60_000,
      ).toISOString(),
    },
    contactSummary: { confirmedCount: 0 },
    currentAlert: null,
    lastAlertOutcome: null,
  };
};

export const createFixtureCheckInApi = (session: AuthSession): CheckInApi => ({
  async getStatus() {
    const startedAtMs = Date.now();
    const record = await readFixture(session.user.id);
    const intervalHours = record.safetyPlan?.intervalHours ?? 36;
    const nowMs = Date.now();
    const status = record.status
      ? { ...record.status, serverTime: new Date(nowMs).toISOString() }
      : createInitialStatus(intervalHours, nowMs);

    if (!record.status)
      await writeFixture(session.user.id, { ...record, status });
    return snapshot(safetyStatusSchema.parse(status), startedAtMs, Date.now());
  },

  checkIn(idempotencyKey) {
    return serializeFixtureMutation(session.user.id, async () => {
      const startedAtMs = Date.now();
      const record = await readFixture(session.user.id);
      const replay = record.checkInResponses?.[idempotencyKey];
      const nowMs = Date.now();

      if (replay) {
        const replayed = {
          ...replay,
          serverTime: new Date(nowMs).toISOString(),
        };
        return snapshot(replayed, startedAtMs, Date.now());
      }

      const intervalHours = record.safetyPlan?.intervalHours ?? 36;
      const now = new Date(nowMs).toISOString();
      const previousAlert = record.alertContext?.currentAlert;
      const notificationStarted =
        previousAlert &&
        (previousAlert.delivery.status !== "not_started" ||
          ["triggering", "triggered", "acknowledged"].includes(
            previousAlert.state,
          ));
      const lastAlertOutcome = previousAlert
        ? {
            alertId: previousAlert.id,
            result: notificationStarted
              ? ("correction_queued" as const)
              : ("cancelled_before_notification" as const),
            correctionStatus: notificationStarted
              ? ("queued" as const)
              : ("not_required" as const),
          }
        : null;
      const status: SafetyStatus = {
        ...(record.status ?? createInitialStatus(intervalHours, nowMs)),
        serverTime: now,
        plan: {
          state: "active",
          intervalHours,
          lastCheckInAt: now,
          nextDeadlineAt: new Date(
            nowMs + intervalHours * 60 * 60_000,
          ).toISOString(),
        },
        currentAlert: null,
        lastAlertOutcome,
      };
      const alertContext = record.alertContext
        ? {
            ...record.alertContext,
            serverTime: now,
            plan: {
              state: status.plan.state,
              nextDeadlineAt: status.plan.nextDeadlineAt,
              snoozedUntil: status.plan.snoozedUntil ?? null,
            },
            currentAlert: previousAlert
              ? {
                  ...previousAlert,
                  state: "resolved" as const,
                  correction: {
                    status:
                      lastAlertOutcome?.correctionStatus ?? "not_required",
                    requestedAt: notificationStarted ? now : null,
                  },
                }
              : null,
          }
        : undefined;
      await writeFixture(session.user.id, {
        ...record,
        status,
        alertContext,
        checkInResponses: {
          ...record.checkInResponses,
          [idempotencyKey]: status,
        },
      });
      return snapshot(
        safetyStatusSchema.parse(status),
        startedAtMs,
        Date.now(),
      );
    });
  },
});
