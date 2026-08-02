import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthSession } from "@/features/auth/types";
import type { SafetyStatus } from "@/features/check-in/types";
import type { DeviceInput, ProfileInput } from "@/features/onboarding/types";
import type { TrustedContact } from "@/features/trusted-contacts/types";

import {
  settingsProjectionSchema,
  type SettingsApi,
  type SettingsProjection,
} from "./types";

const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;

type AccountRequests = {
  exportRequest?: SettingsProjection["account"]["exportRequest"];
  deletionRequest?: SettingsProjection["account"]["deletionRequest"];
};
type FixtureRecord = Record<string, unknown> & {
  profile?: ProfileInput;
  device?: DeviceInput;
  safetyPlan?: { intervalHours?: 24 | 36 | 48; fixtureOnly?: boolean };
  status?: SafetyStatus;
  trustedContacts?: TrustedContact[];
  accountRequests?: AccountRequests;
  settingsResponses?: Record<string, SettingsProjection>;
};

const readFixture = async (userId: string): Promise<FixtureRecord> =>
  JSON.parse((await AsyncStorage.getItem(fixtureKey(userId))) ?? "{}");
const writeFixture = (userId: string, record: FixtureRecord) =>
  AsyncStorage.setItem(fixtureKey(userId), JSON.stringify(record));

const createActiveStatus = (
  record: FixtureRecord,
  intervalHours: 24 | 36 | 48,
  nowMs: number,
): SafetyStatus => ({
  serverTime: new Date(nowMs).toISOString(),
  plan: {
    state: "active",
    intervalHours,
    lastCheckInAt: record.status?.plan.lastCheckInAt ?? null,
    nextDeadlineAt: new Date(nowMs + intervalHours * 60 * 60_000).toISOString(),
    snoozedUntil: null,
  },
  contactSummary: record.status?.contactSummary ?? { confirmedCount: 0 },
  currentAlert: null,
  lastAlertOutcome: null,
});

const fixtureLocks = new Map<string, Promise<unknown>>();
const serialize = async <T>(userId: string, action: () => Promise<T>) => {
  const previous = fixtureLocks.get(userId) ?? Promise.resolve();
  const current = previous.then(action, action);
  fixtureLocks.set(userId, current);
  try {
    return await current;
  } finally {
    if (fixtureLocks.get(userId) === current) fixtureLocks.delete(userId);
  }
};

const project = (
  session: AuthSession,
  record: FixtureRecord,
  nowMs = Date.now(),
): SettingsProjection => {
  const contacts = record.trustedContacts ?? [];
  const intervalHours = record.status?.plan.intervalHours ?? record.safetyPlan?.intervalHours ?? 36;
  const planState = record.status?.plan.state ?? "active";
  const nextDeadlineAt =
    planState === "inactive"
      ? null
      : (record.status?.plan.nextDeadlineAt ??
        new Date(nowMs + intervalHours * 60 * 60_000).toISOString());
  return settingsProjectionSchema.parse({
    serverTime: new Date(nowMs).toISOString(),
    profile: {
      displayName: record.profile?.displayName ?? session.user.email.split("@")[0] ?? "Bạn",
      email: session.user.email,
      timezone: record.profile?.timezone ?? "UTC",
    },
    safetyPlan: {
      state: planState,
      intervalHours,
      nextDeadlineAt,
      snoozedUntil: record.status?.plan.snoozedUntil ?? null,
    },
    contacts: {
      totalCount: contacts.length,
      acceptedCount: contacts.filter(({ invitation }) => invitation.status === "accepted").length,
    },
    push: { registration: record.device ? "registered" : "none" },
    account: {
      exportRequest: record.accountRequests?.exportRequest ?? null,
      deletionRequest: record.accountRequests?.deletionRequest ?? null,
    },
    allowedActions: {
      canUpdateProfile: true,
      canUpdateSafetyPlan: planState !== "inactive",
      canDisableSafetyPlan: planState !== "inactive",
      canRequestExport: !record.accountRequests?.exportRequest,
      canRequestDeletion: !record.accountRequests?.deletionRequest,
    },
  });
};

export const createFixtureSettingsApi = (session: AuthSession): SettingsApi => {
  const mutate = (action: (record: FixtureRecord, nowMs: number) => FixtureRecord) =>
    serialize(session.user.id, async () => {
      const nowMs = Date.now();
      const current = await readFixture(session.user.id);
      const next = action(current, nowMs);
      await writeFixture(session.user.id, next);
      return project(session, next, nowMs);
    });

  const idempotent = (
    actionName: string,
    key: string,
    action: (record: FixtureRecord, nowMs: number) => FixtureRecord,
  ) =>
    serialize(session.user.id, async () => {
      const current = await readFixture(session.user.id);
      const replay = current.settingsResponses?.[`${actionName}:${key}`];
      if (replay) return settingsProjectionSchema.parse(replay);
      const nowMs = Date.now();
      const changed = action(current, nowMs);
      const result = project(session, changed, nowMs);
      await writeFixture(session.user.id, {
        ...changed,
        settingsResponses: {
          ...changed.settingsResponses,
          [`${actionName}:${key}`]: result,
        },
      });
      return result;
    });

  return {
    async getSettings() {
      const record = await readFixture(session.user.id);
      if (record.status) return project(session, record);
      const nowMs = Date.now();
      const intervalHours = record.safetyPlan?.intervalHours ?? 36;
      const initialized = {
        ...record,
        status: createActiveStatus(record, intervalHours, nowMs),
      };
      await writeFixture(session.user.id, initialized);
      return project(session, initialized, nowMs);
    },
    updateProfile: (profile) =>
      mutate((record, nowMs) => {
        const intervalHours = record.status?.plan.intervalHours ?? record.safetyPlan?.intervalHours ?? 36;
        return {
          ...record,
          profile,
          status:
            record.status?.plan.state === "inactive"
              ? {
                  ...record.status,
                  serverTime: new Date(nowMs).toISOString(),
                  plan: { ...record.status.plan, nextDeadlineAt: null },
                }
              : createActiveStatus(record, intervalHours, nowMs),
        };
      }),
    updateSafetyPlan: (intervalHours) =>
      mutate((record, nowMs) => ({
        ...record,
        safetyPlan: { intervalHours, fixtureOnly: true },
        status: createActiveStatus(record, intervalHours, nowMs),
      })),
    disableSafetyPlan: (key) =>
      idempotent("disable", key, (record, nowMs) => ({
        ...record,
        status: {
          serverTime: new Date(nowMs).toISOString(),
          plan: {
            state: "inactive",
            intervalHours: record.status?.plan.intervalHours ?? record.safetyPlan?.intervalHours ?? 36,
            lastCheckInAt: record.status?.plan.lastCheckInAt ?? null,
            nextDeadlineAt: null,
            snoozedUntil: null,
          },
          contactSummary: record.status?.contactSummary ?? { confirmedCount: 0 },
          currentAlert: null,
          lastAlertOutcome: null,
        },
      })),
    requestAccountExport: (key) =>
      idempotent("export", key, (record, nowMs) => ({
        ...record,
        accountRequests: {
          ...record.accountRequests,
          exportRequest: {
            status: "requested",
            requestedAt: new Date(nowMs).toISOString(),
          },
        },
      })),
    requestAccountDeletion: (key) =>
      idempotent("deletion", key, (record, nowMs) => ({
        ...record,
        accountRequests: {
          ...record.accountRequests,
          deletionRequest: {
            status: "requested",
            requestedAt: new Date(nowMs).toISOString(),
          },
        },
      })),
  };
};
