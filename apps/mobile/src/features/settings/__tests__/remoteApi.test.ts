import { createRemoteSettingsApi } from "../api";
import { settingsProjection } from "./types.test";

const session = {
  accessToken: "access-token",
  user: { id: "user-1", email: "user@example.test" },
};
const response = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe("remote settings API", () => {
  it("requires authoritative interval and deadline from the server", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      response({
        ...settingsProjection,
        safetyPlan: {
          ...settingsProjection.safetyPlan,
          intervalHours: 48,
          nextDeadlineAt: "2026-08-04T12:00:00.000Z",
        },
      }),
    );
    const result = await createRemoteSettingsApi(
      session,
      "https://api.example.test/",
      fetcher,
    ).updateSafetyPlan(48);
    expect(result.safetyPlan.nextDeadlineAt).toBe("2026-08-04T12:00:00.000Z");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/safety-plan",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ checkInIntervalHours: 48 }),
      }),
    );
  });

  it("does not report disable success when the server still returns active", async () => {
    const fetcher = jest.fn().mockResolvedValue(response(settingsProjection));
    await expect(
      createRemoteSettingsApi(session, "https://api.example.test", fetcher).disableSafetyPlan(
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toEqual(expect.objectContaining({ kind: "contract" }));
  });

  it("sends idempotency for deletion and requires a request state", async () => {
    const requestedAt = "2026-08-02T12:00:00.000Z";
    const fetcher = jest.fn().mockResolvedValue(
      response({
        ...settingsProjection,
        account: {
          ...settingsProjection.account,
          deletionRequest: { status: "requested", requestedAt },
        },
      }),
    );
    await createRemoteSettingsApi(session, "https://api.example.test", fetcher).requestAccountDeletion(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/v1/account/deletion-requests",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
  });
});
