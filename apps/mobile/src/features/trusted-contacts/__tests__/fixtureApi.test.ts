import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { createTrustedContactsApi } from "../api";
import { TrustedContactsApiError } from "../types";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));

const randomUUID = jest.mocked(Crypto.randomUUID);

const session = {
  accessToken: "fixture-token",
  user: { id: "fixture-contact-user", email: "fixture@example.test" },
};

const input = (index: number) => ({
  displayName: `Contact ${index}`,
  email: `contact${index}@example.test`,
  consentConfirmed: true as const,
});

describe("local trusted-contacts fixture", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    let sequence = 0;
    randomUUID.mockReset();
    randomUUID.mockImplementation(
      () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    );
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
  });

  afterEach(() => jest.useRealTimers());

  it("enforces normalized duplicate email and the three-contact limit", async () => {
    const api = createTrustedContactsApi(session);
    await api.createContact(input(1));
    await expect(
      api.createContact({ ...input(2), email: " CONTACT1@example.test " }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<TrustedContactsApiError>>({
        code: "CONTACT_DUPLICATE",
      }),
    );

    await api.createContact(input(2));
    await api.createContact(input(3));
    await expect(api.createContact(input(4))).rejects.toEqual(
      expect.objectContaining<Partial<TrustedContactsApiError>>({
        code: "CONTACT_LIMIT_REACHED",
      }),
    );
  });

  it("reorders atomically and compacts priority after removal", async () => {
    const api = createTrustedContactsApi(session);
    const first = await api.createContact(input(1));
    const second = await api.createContact(input(2));
    const firstId = first.projection.contacts[0]!.id;
    const secondId = second.projection.contacts[1]!.id;

    const reordered = await api.reorderContacts([secondId, firstId]);
    expect(reordered.projection.contacts.map(({ id }) => id)).toEqual([
      secondId,
      firstId,
    ]);

    const removed = await api.removeContact(secondId);
    expect(removed.projection.contacts).toEqual([
      expect.objectContaining({ id: firstId, priority: 1 }),
    ]);
  });

  it("uses the authoritative resend timestamp for cooldown", async () => {
    const api = createTrustedContactsApi(session);
    const created = await api.createContact(input(1));
    const contactId = created.projection.contacts[0]!.id;

    await expect(api.resendInvitation(contactId)).rejects.toEqual(
      expect.objectContaining<Partial<TrustedContactsApiError>>({
        code: "INVITATION_COOLDOWN",
        details: {
          retryAt: "2026-08-02T00:01:00.000Z",
        },
      }),
    );

    jest.setSystemTime(new Date("2026-08-02T00:01:01.000Z"));
    const resent = await api.resendInvitation(contactId);
    expect(resent.projection.contacts[0]?.invitation).toEqual(
      expect.objectContaining({
        status: "pending",
        sentAt: "2026-08-02T00:01:01.000Z",
      }),
    );
  });
});
