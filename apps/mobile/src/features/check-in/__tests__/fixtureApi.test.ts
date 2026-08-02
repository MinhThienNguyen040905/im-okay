import AsyncStorage from "@react-native-async-storage/async-storage";

import { createCheckInApi } from "../api";

const session = {
  accessToken: "fixture-token",
  user: { id: "fixture-check-in-user", email: "fixture@example.test" },
};

describe("local check-in fixture", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
    await AsyncStorage.setItem(
      `imokay.fixture.server.${session.user.id}.v1`,
      JSON.stringify({ safetyPlan: { intervalHours: 24 } }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it("returns server time, last check-in and exact authoritative deadline", async () => {
    const result = await createCheckInApi(session).getStatus();
    expect(result.status.serverTime).toBe("2026-08-02T00:00:00.000Z");
    expect(result.status.plan.nextDeadlineAt).toBe("2026-08-03T00:00:00.000Z");
  });

  it("replays one result for duplicate idempotency keys", async () => {
    const api = createCheckInApi(session);
    const first = await api.checkIn("same-key");
    jest.setSystemTime(new Date("2026-08-02T00:05:00.000Z"));
    const replay = await api.checkIn("same-key");

    expect(replay.status.plan.lastCheckInAt).toBe(
      first.status.plan.lastCheckInAt,
    );
    expect(replay.status.plan.nextDeadlineAt).toBe(
      first.status.plan.nextDeadlineAt,
    );
  });
});
