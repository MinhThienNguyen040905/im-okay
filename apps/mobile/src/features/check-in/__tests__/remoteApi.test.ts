import { createRemoteCheckInApi } from "../api";
import { CheckInApiError } from "../types";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};

const status = {
  serverTime: "2026-08-02T00:00:00.000Z",
  plan: {
    state: "active" as const,
    intervalHours: 36 as const,
    lastCheckInAt: "2026-08-01T12:00:00.000Z",
    nextDeadlineAt: "2026-08-03T00:00:00.000Z",
  },
  contactSummary: { confirmedCount: 1 },
  currentAlert: null,
};

const response = (body: unknown, ok = true, httpStatus = 200) =>
  ({
    ok,
    status: httpStatus,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote check-in API", () => {
  it("sends the stable idempotency key and parses authoritative status", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(status));
    const api = createRemoteCheckInApi(
      session,
      "https://api.example.test/",
      fetcher,
    );

    const result = await api.checkIn("attempt-1");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/check-ins",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": "attempt-1" }),
      }),
    );
    expect(result.status.plan.nextDeadlineAt).toBe("2026-08-03T00:00:00.000Z");
  });

  it("classifies a network failure as retryable without reporting success", async () => {
    const fetcher = jest.fn().mockRejectedValue(new TypeError("network"));
    const api = createRemoteCheckInApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await expect(api.checkIn("attempt-1")).rejects.toEqual(
      expect.objectContaining<Partial<CheckInApiError>>({
        kind: "offline",
        retryable: true,
      }),
    );
  });
});
