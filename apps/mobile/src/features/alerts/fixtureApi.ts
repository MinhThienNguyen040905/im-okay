import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type { AuthSession } from "@/features/auth/types";
import { createFixtureCheckInApi } from "@/features/check-in/fixtureApi";
import type { SafetyStatus } from "@/features/check-in/types";
import type { TrustedContact } from "@/features/trusted-contacts/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import {
  alertContextProjectionSchema,
  AlertsApiError,
  type AlertContextProjection,
  type AlertContextSnapshot,
  type AlertsApi,
  type AlertSource,
  type SnoozeDuration,
} from "./types";

// Local-only fake server. Production alert transitions and policy remain backend-owned.
const WARNING_WINDOW_MS = 4 * 60 * 60_000;
const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;

type FixtureRecord = Record<string, unknown> & {
  status?: SafetyStatus;
  trustedContacts?: TrustedContact[];
  alertContext?: AlertContextProjection;
  alertActionResponses?: Record<string, AlertContextProjection>;
};

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

const acceptedContacts = (record: FixtureRecord) =>
  (record.trustedContacts ?? [])
    .filter(({ invitation }) => invitation.status === "accepted")
    .sort((left, right) => left.priority - right.priority);

const isTerminal = (state: string) =>
  state === "resolved" || state === "cancelled";

const buildContext = (
  record: FixtureRecord,
  status: SafetyStatus,
  nowMs: number,
): AlertContextProjection => {
  const contacts = acceptedContacts(record);
  const nextDeadlineAt = status.plan.nextDeadlineAt ?? null;
  const remainingMs = nextDeadlineAt
    ? Date.parse(nextDeadlineAt) - nowMs
    : Number.POSITIVE_INFINITY;
  const derivedWarning =
    status.plan.state === "active" &&
    nextDeadlineAt &&
    remainingMs <= WARNING_WINDOW_MS
      ? {
          id: status.currentAlert?.id ?? "fixture-deadline-warning",
          source: "deadline" as const,
          state:
            remainingMs <= 0 ? ("triggering" as const) : ("warning" as const),
          triggerAt: nextDeadlineAt,
          delivery: {
            status:
              remainingMs <= 0 ? ("queued" as const) : ("not_started" as const),
            channels: ["email" as const],
            acceptedAt: remainingMs <= 0 ? new Date(nowMs).toISOString() : null,
          },
          correction: { status: "not_required" as const, requestedAt: null },
        }
      : null;
  const currentAlert = record.alertContext?.currentAlert ?? derivedWarning;
  const activeAlert = currentAlert && !isTerminal(currentAlert.state);
  const snoozeAllowed =
    status.plan.state === "active" &&
    remainingMs > 0 &&
    (!activeAlert ||
      (currentAlert.source === "deadline" &&
        currentAlert.delivery.status === "not_started"));

  return alertContextProjectionSchema.parse({
    serverTime: new Date(nowMs).toISOString(),
    plan: {
      state: status.plan.state,
      nextDeadlineAt,
      snoozedUntil: status.plan.snoozedUntil ?? null,
    },
    contactSummary: {
      eligibleCount: contacts.length,
      firstContactName: contacts[0]?.displayName ?? null,
      displayNames: contacts.map(({ displayName }) => displayName),
    },
    channelSummary: {
      deadline: ["email"],
      sos: ["push", "email"],
      drill: ["push", "email"],
    },
    currentAlert,
    availableActions: {
      canCheckIn: status.plan.state !== "inactive",
      canSendSos:
        contacts.length > 0 &&
        (!activeAlert || currentAlert.source === "deadline"),
      canSendDrill: contacts.length > 0 && !activeAlert,
      snoozeDurationsHours: snoozeAllowed ? [1, 4, 8] : [],
    },
  });
};

const snapshot = (
  projection: AlertContextProjection,
  startedAtMs: number,
  receivedAtMs: number,
): AlertContextSnapshot => ({
  projection,
  receivedAtMs,
  clockOffsetMs: calculateServerClockOffset(
    projection.serverTime,
    startedAtMs,
    receivedAtMs,
  ),
});

const fixtureError = (code: string, message: string, retryable = false) =>
  new AlertsApiError(message, "server", retryable, code);

export const createFixtureAlertsApi = (session: AuthSession): AlertsApi => {
  const getFreshContext = async () => {
    const statusSnapshot = await createFixtureCheckInApi(session).getStatus();
    const record = await readFixture(session.user.id);
    return {
      context: buildContext(record, statusSnapshot.status, Date.now()),
      record,
      status: statusSnapshot.status,
    };
  };

  const sendAlert = (
    source: Extract<AlertSource, "sos" | "drill">,
    key: string,
  ) =>
    serializeFixtureMutation(session.user.id, async () => {
      const startedAtMs = Date.now();
      const { context, record, status } = await getFreshContext();
      const replay = record.alertActionResponses?.[`${source}:${key}`];
      if (replay) {
        const projection = {
          ...replay,
          serverTime: new Date().toISOString(),
        };
        return snapshot(projection, startedAtMs, Date.now());
      }
      if (context.contactSummary.eligibleCount === 0) {
        throw fixtureError(
          "NO_ELIGIBLE_CONTACTS",
          "Chưa có liên hệ đã xác nhận để nhận thông báo.",
        );
      }
      if (
        context.currentAlert &&
        !isTerminal(context.currentAlert.state) &&
        context.currentAlert.source !== "deadline"
      ) {
        throw fixtureError(
          "ALERT_ALREADY_ACTIVE",
          "Một cảnh báo khác đang được xử lý.",
        );
      }

      const now = new Date().toISOString();
      const currentAlert = {
        id: Crypto.randomUUID(),
        source,
        state: "triggered" as const,
        triggerAt: now,
        delivery: {
          status: "queued" as const,
          channels: ["push" as const, "email" as const],
          acceptedAt: now,
        },
        correction: { status: "not_required" as const, requestedAt: null },
      };
      const projection = alertContextProjectionSchema.parse({
        ...context,
        serverTime: now,
        currentAlert,
        availableActions: {
          ...context.availableActions,
          canSendSos: false,
          canSendDrill: false,
          snoozeDurationsHours: [],
        },
      });
      const nextStatus: SafetyStatus = {
        ...status,
        serverTime: now,
        currentAlert: { id: currentAlert.id, state: currentAlert.state },
        lastAlertOutcome: null,
      };
      await writeFixture(session.user.id, {
        ...record,
        status: nextStatus,
        alertContext: projection,
        alertActionResponses: {
          ...record.alertActionResponses,
          [`${source}:${key}`]: projection,
        },
      });
      return snapshot(projection, startedAtMs, Date.now());
    });

  return {
    async getContext() {
      const startedAtMs = Date.now();
      const { context } = await getFreshContext();
      return snapshot(context, startedAtMs, Date.now());
    },

    snooze(durationHours: SnoozeDuration, idempotencyKey: string) {
      return serializeFixtureMutation(session.user.id, async () => {
        const startedAtMs = Date.now();
        const { context, record, status } = await getFreshContext();
        const replayKey = `snooze-${durationHours}:${idempotencyKey}`;
        const replay = record.alertActionResponses?.[replayKey];
        if (replay) {
          return snapshot(
            { ...replay, serverTime: new Date().toISOString() },
            startedAtMs,
            Date.now(),
          );
        }
        if (
          !context.availableActions.snoozeDurationsHours.includes(durationHours)
        ) {
          throw fixtureError(
            "SNOOZE_NOT_ALLOWED",
            "Không thể tạm hoãn ở trạng thái cảnh báo hiện tại.",
          );
        }

        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();
        const snoozedUntil = new Date(
          nowMs + durationHours * 60 * 60_000,
        ).toISOString();
        const nextStatus: SafetyStatus = {
          ...status,
          serverTime: now,
          plan: {
            ...status.plan,
            state: "snoozed",
            nextDeadlineAt: snoozedUntil,
            snoozedUntil,
          },
          currentAlert: null,
          lastAlertOutcome: context.currentAlert
            ? {
                alertId: context.currentAlert.id,
                result: "cancelled_before_notification",
                correctionStatus: "not_required",
              }
            : null,
        };
        const projection = alertContextProjectionSchema.parse({
          ...context,
          serverTime: now,
          plan: {
            state: "snoozed",
            nextDeadlineAt: snoozedUntil,
            snoozedUntil,
          },
          currentAlert: context.currentAlert
            ? {
                ...context.currentAlert,
                state: "cancelled",
                correction: { status: "not_required", requestedAt: null },
              }
            : null,
          availableActions: {
            ...context.availableActions,
            snoozeDurationsHours: [],
          },
        });
        await writeFixture(session.user.id, {
          ...record,
          status: nextStatus,
          alertContext: projection,
          alertActionResponses: {
            ...record.alertActionResponses,
            [replayKey]: projection,
          },
        });
        return snapshot(projection, startedAtMs, Date.now());
      });
    },

    sendSos: (idempotencyKey, _location) => sendAlert("sos", idempotencyKey),
    sendDrill: (idempotencyKey) => sendAlert("drill", idempotencyKey),
  };
};
