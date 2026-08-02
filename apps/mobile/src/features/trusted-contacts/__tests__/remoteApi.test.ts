import { createRemoteTrustedContactsApi } from "../api";
import { TrustedContactsApiError } from "../types";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};

const projection = {
  serverTime: "2026-08-02T00:00:00.000Z",
  maxContacts: 3 as const,
  contacts: [],
};

const response = (body: unknown, ok = true, httpStatus = 200) =>
  ({
    ok,
    status: httpStatus,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote trusted-contacts API", () => {
  it("creates an email-only contact and parses the server projection", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(projection));
    const api = createRemoteTrustedContactsApi(
      session,
      "https://api.example.test/",
      fetcher,
    );

    await api.createContact({
      displayName: "Lan",
      email: "lan@example.test",
      consentConfirmed: true,
    });

    const [, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/trusted-contacts",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(options.body))).toEqual({
      displayName: "Lan",
      email: "lan@example.test",
      consentConfirmed: true,
    });
    expect(String(options.body)).not.toMatch(/phone|sms/i);
  });

  it("sends the full order for one atomic reorder", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(projection));
    const api = createRemoteTrustedContactsApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await api.reorderContacts(["contact-2", "contact-1"]);

    const [, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({
      orderedContactIds: ["contact-2", "contact-1"],
    });
  });

  it("maps duplicate and cooldown errors without trusting server copy", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        response(
          {
            error: {
              code: "CONTACT_DUPLICATE",
              message: "internal text",
              details: { field: "email" },
            },
          },
          false,
          409,
        ),
      )
      .mockResolvedValueOnce(
        response(
          {
            error: {
              code: "INVITATION_COOLDOWN",
              details: { retryAt: "2026-08-02T00:01:00.000Z" },
            },
          },
          false,
          429,
        ),
      );
    const api = createRemoteTrustedContactsApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await expect(
      api.createContact({
        displayName: "Lan",
        email: "lan@example.test",
        consentConfirmed: true,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<TrustedContactsApiError>>({
        code: "CONTACT_DUPLICATE",
        message: "Email này đã có trong danh sách liên hệ tin cậy.",
      }),
    );
    await expect(api.resendInvitation("contact-1")).rejects.toEqual(
      expect.objectContaining<Partial<TrustedContactsApiError>>({
        code: "INVITATION_COOLDOWN",
        retryable: true,
        details: { retryAt: "2026-08-02T00:01:00.000Z" },
      }),
    );
  });
});
