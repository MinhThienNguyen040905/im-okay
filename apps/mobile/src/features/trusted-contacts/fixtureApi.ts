import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type { AuthSession } from "@/features/auth/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import {
  TrustedContactsApiError,
  trustedContactsProjectionSchema,
  type TrustedContact,
  type TrustedContactsApi,
  type TrustedContactsProjection,
  type TrustedContactsSnapshot,
} from "./types";

// These durations only make cooldown/expiry states testable in local fixture mode.
// Production policy is server-owned and must never import these values.
const FIXTURE_RESEND_COOLDOWN_MS = 60_000;
const FIXTURE_INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60_000;
const MAX_CONTACTS = 3;

const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;

type FixtureRecord = Record<string, unknown> & {
  trustedContacts?: TrustedContact[];
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

const normalizeContacts = (contacts: TrustedContact[]) =>
  [...contacts]
    .sort((left, right) => left.priority - right.priority)
    .map((contact, index) => ({ ...contact, priority: index + 1 }));

const projection = (
  contacts: TrustedContact[],
  serverTime: string,
): TrustedContactsProjection =>
  trustedContactsProjectionSchema.parse({
    serverTime,
    maxContacts: MAX_CONTACTS,
    contacts: normalizeContacts(contacts),
  });

const snapshot = (
  contacts: TrustedContact[],
  startedAtMs: number,
  receivedAtMs: number,
): TrustedContactsSnapshot => {
  const value = projection(contacts, new Date(receivedAtMs).toISOString());
  return {
    projection: value,
    receivedAtMs,
    clockOffsetMs: calculateServerClockOffset(
      value.serverTime,
      startedAtMs,
      receivedAtMs,
    ),
  };
};

const fixtureError = (
  code: string,
  message: string,
  details?: { field?: "email"; retryAt?: string },
) =>
  new TrustedContactsApiError(
    message,
    "server",
    false,
    code,
    undefined,
    details,
  );

export const createFixtureTrustedContactsApi = (
  session: AuthSession,
): TrustedContactsApi => {
  const mutate = (action: (record: FixtureRecord) => TrustedContact[]) =>
    serializeFixtureMutation(session.user.id, async () => {
      const startedAtMs = Date.now();
      const record = await readFixture(session.user.id);
      const contacts = normalizeContacts(action(record));
      await writeFixture(session.user.id, {
        ...record,
        trustedContacts: contacts,
      });
      return snapshot(contacts, startedAtMs, Date.now());
    });

  return {
    async getContacts() {
      const startedAtMs = Date.now();
      const record = await readFixture(session.user.id);
      return snapshot(record.trustedContacts ?? [], startedAtMs, Date.now());
    },

    createContact(input) {
      return mutate((record) => {
        const contacts = record.trustedContacts ?? [];
        if (contacts.length >= MAX_CONTACTS) {
          throw fixtureError(
            "CONTACT_LIMIT_REACHED",
            "Bạn đã có đủ 3 liên hệ tin cậy.",
          );
        }

        const normalizedEmail = input.email.trim().toLocaleLowerCase("en-US");
        if (
          contacts.some(
            (contact) =>
              contact.email.trim().toLocaleLowerCase("en-US") ===
              normalizedEmail,
          )
        ) {
          throw fixtureError(
            "CONTACT_DUPLICATE",
            "Email này đã có trong danh sách liên hệ tin cậy.",
            { field: "email" },
          );
        }

        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();
        return [
          ...contacts,
          {
            id: Crypto.randomUUID(),
            displayName: input.displayName.trim(),
            email: normalizedEmail,
            priority: contacts.length + 1,
            invitation: {
              status: "pending" as const,
              sentAt: now,
              expiresAt: new Date(
                nowMs + FIXTURE_INVITATION_EXPIRY_MS,
              ).toISOString(),
              resendAvailableAt: new Date(
                nowMs + FIXTURE_RESEND_COOLDOWN_MS,
              ).toISOString(),
            },
          },
        ];
      });
    },

    removeContact(contactId) {
      return mutate((record) => {
        const contacts = record.trustedContacts ?? [];
        if (!contacts.some((contact) => contact.id === contactId)) {
          throw fixtureError(
            "CONTACT_NOT_FOUND",
            "Liên hệ này không còn trong danh sách.",
          );
        }
        return contacts.filter((contact) => contact.id !== contactId);
      });
    },

    reorderContacts(orderedContactIds) {
      return mutate((record) => {
        const contacts = record.trustedContacts ?? [];
        const currentIds = new Set(contacts.map(({ id }) => id));
        const requestedIds = new Set(orderedContactIds);
        if (
          currentIds.size !== requestedIds.size ||
          orderedContactIds.length !== requestedIds.size ||
          orderedContactIds.some((id) => !currentIds.has(id))
        ) {
          throw fixtureError(
            "CONTACT_REORDER_CONFLICT",
            "Danh sách đã thay đổi. Hãy đồng bộ rồi thử lại.",
          );
        }
        const byId = new Map(contacts.map((contact) => [contact.id, contact]));
        return orderedContactIds.map((id, index) => ({
          ...byId.get(id)!,
          priority: index + 1,
        }));
      });
    },

    resendInvitation(contactId) {
      return mutate((record) => {
        const contacts = record.trustedContacts ?? [];
        const contact = contacts.find(({ id }) => id === contactId);
        if (!contact) {
          throw fixtureError(
            "CONTACT_NOT_FOUND",
            "Liên hệ này không còn trong danh sách.",
          );
        }
        if (contact.invitation.status === "accepted") {
          throw fixtureError(
            "INVITATION_ALREADY_ACCEPTED",
            "Liên hệ này đã chấp nhận lời mời.",
          );
        }

        const nowMs = Date.now();
        const retryAt = contact.invitation.resendAvailableAt;
        if (retryAt && Date.parse(retryAt) > nowMs) {
          throw fixtureError(
            "INVITATION_COOLDOWN",
            "Chưa thể gửi lại lời mời. Vui lòng chờ hết thời gian.",
            { retryAt },
          );
        }

        const now = new Date(nowMs).toISOString();
        return contacts.map((item) =>
          item.id === contactId
            ? {
                ...item,
                invitation: {
                  status: "pending" as const,
                  sentAt: now,
                  expiresAt: new Date(
                    nowMs + FIXTURE_INVITATION_EXPIRY_MS,
                  ).toISOString(),
                  resendAvailableAt: new Date(
                    nowMs + FIXTURE_RESEND_COOLDOWN_MS,
                  ).toISOString(),
                },
              }
            : item,
        );
      });
    },
  };
};
