import { createRemoteOnboardingApi } from "../api";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};
const state = {
  serverTime: "2026-08-04T00:00:00.000Z",
  profile: {
    accountState: "active" as const,
    displayName: "An",
    timezone: "Asia/Ho_Chi_Minh",
  },
  safetyPlan: {
    intervalHours: 36 as const,
    lastCheckInAt: "2026-08-04T00:00:00.000Z",
    nextDeadlineAt: "2026-08-05T12:00:00.000Z",
    state: "active" as const,
  },
  push: { registration: "registered" as const },
};
const response = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    headers: { get: jest.fn().mockReturnValue("request-1") },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote onboarding API", () => {
  it("restores the authoritative onboarding state with both auth headers", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(state));
    const result = await createRemoteOnboardingApi(
      session,
      "https://api.example.test/",
      fetcher,
      "publishable-key",
    ).getState();

    expect(result).toEqual(state);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          apikey: "publishable-key",
          Authorization: "Bearer access-token",
        }),
      }),
    );
  });

  it("keeps profile and safety-plan mutation paths compatible", async () => {
    const fetcher = jest.fn().mockResolvedValue(response({ ok: true }));
    const api = createRemoteOnboardingApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await api.saveProfile({
      displayName: "An",
      timezone: "Asia/Ho_Chi_Minh",
    });
    await api.saveSafetyPlan(48);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/v1/me",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/v1/safety-plan",
      expect.objectContaining({
        body: JSON.stringify({ checkInIntervalHours: 48 }),
        method: "PUT",
      }),
    );
  });

  it("does not mark a rejected server mutation as complete", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        response({ error: { code: "ACCOUNT_DISABLED" } }, false, 403),
      );
    const api = createRemoteOnboardingApi(
      session,
      "https://api.example.test",
      fetcher,
    );

    await expect(api.saveSafetyPlan(36)).rejects.toThrow(
      "Máy chủ từ chối yêu cầu (403) · request-1.",
    );
  });
});
