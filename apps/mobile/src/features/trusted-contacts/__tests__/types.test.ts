import { trustedContactsProjectionSchema } from "../types";

const contact = (
  id: string,
  priority: number,
  email = `${id}@example.test`,
) => ({
  id,
  displayName: `Contact ${id}`,
  email,
  priority,
  invitation: {
    status: "pending" as const,
    sentAt: "2026-08-02T00:00:00.000Z",
    expiresAt: "2026-08-09T00:00:00.000Z",
    resendAvailableAt: "2026-08-02T00:01:00.000Z",
  },
});

const projection = (contacts: ReturnType<typeof contact>[]) => ({
  serverTime: "2026-08-02T00:00:00.000Z",
  maxContacts: 3 as const,
  contacts,
});

describe("trusted-contact projection contract", () => {
  it("accepts server-owned invitation status", () => {
    const parsed = trustedContactsProjectionSchema.parse({
      ...projection([contact("one", 1)]),
      contacts: [
        {
          ...contact("one", 1),
          invitation: {
            ...contact("one", 1).invitation,
            status: "accepted",
          },
        },
      ],
    });
    expect(parsed.contacts[0]?.invitation.status).toBe("accepted");
  });

  it("rejects more than three contacts", () => {
    expect(() =>
      trustedContactsProjectionSchema.parse(
        projection([
          contact("one", 1),
          contact("two", 2),
          contact("three", 3),
          contact("four", 4),
        ]),
      ),
    ).toThrow();
  });

  it("rejects duplicate normalized email and priority", () => {
    expect(() =>
      trustedContactsProjectionSchema.parse(
        projection([
          contact("one", 1, "LAN@example.test"),
          contact("two", 1, "lan@example.test"),
        ]),
      ),
    ).toThrow();
  });

  it("rejects an invitation status outside the API enum", () => {
    expect(() =>
      trustedContactsProjectionSchema.parse({
        ...projection([contact("one", 1)]),
        contacts: [
          {
            ...contact("one", 1),
            invitation: {
              ...contact("one", 1).invitation,
              status: "confirmed-by-client",
            },
          },
        ],
      }),
    ).toThrow();
  });
});
