import { createRemoteAlertsApi } from "../api";
import { AlertsApiError } from "../types";
import { contextProjection } from "./types.test";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};

const response = (body: unknown, ok = true, httpStatus = 200) =>
  ({
    ok,
    status: httpStatus,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote alerts API", () => {
  it("sends a stable idempotency key for SOS and requires SOS source", async () => {
    const sosProjection = {
      ...contextProjection,
      currentAlert: {
        ...contextProjection.currentAlert,
        source: "sos" as const,
        state: "triggered" as const,
        delivery: {
          ...contextProjection.currentAlert.delivery,
          status: "queued" as const,
        },
      },
    };
    const fetcher = jest.fn().mockResolvedValue(response(sosProjection));
    const api = createRemoteAlertsApi(
      session,
      "https://api.example.test/",
      fetcher,
    );

    await api.sendSos("11111111-1111-4111-8111-111111111111");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/alerts/sos",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
  });

  it("rejects an SOS response mislabeled as drill", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      response({
        ...contextProjection,
        currentAlert: {
          ...contextProjection.currentAlert,
          source: "drill",
        },
      }),
    );
    const api = createRemoteAlertsApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await expect(api.sendSos("key")).rejects.toEqual(
      expect.objectContaining<Partial<AlertsApiError>>({ kind: "contract" }),
    );
  });

  it("requires the server to return exact snoozedUntil", async () => {
    const invalid = {
      ...contextProjection,
      plan: { ...contextProjection.plan, state: "active" },
    };
    const fetcher = jest.fn().mockResolvedValue(response(invalid));
    const api = createRemoteAlertsApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await expect(api.snooze(4, "key")).rejects.toEqual(
      expect.objectContaining<Partial<AlertsApiError>>({ kind: "contract" }),
    );
    const [, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ durationHours: 4 });
  });
});
