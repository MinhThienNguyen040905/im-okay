import AsyncStorage from "@react-native-async-storage/async-storage";

import { createFixtureSettingsApi } from "../fixtureApi";

const session = {
  accessToken: "fixture-token",
  user: { id: "settings-user", email: "user@example.test" },
};

describe("local settings fixture", () => {
  beforeEach(() => AsyncStorage.clear());

  it("returns the fixture-server deadline after changing interval", async () => {
    const api = createFixtureSettingsApi(session);
    const projection = await api.updateSafetyPlan(48);
    expect(projection.safetyPlan.intervalHours).toBe(48);
    expect(projection.safetyPlan.nextDeadlineAt).not.toBeNull();
    expect(
      Date.parse(projection.safetyPlan.nextDeadlineAt!) -
        Date.parse(projection.serverTime),
    ).toBe(48 * 60 * 60_000);
  });

  it("creates and persists a new schedule when timezone changes", async () => {
    const api = createFixtureSettingsApi(session);
    await api.getSettings();
    const changed = await api.updateProfile({
      displayName: "Minh Anh",
      timezone: "Asia/Ho_Chi_Minh",
    });
    const restored = await api.getSettings();
    expect(changed.profile.timezone).toBe("Asia/Ho_Chi_Minh");
    expect(
      Date.parse(changed.safetyPlan.nextDeadlineAt!) -
        Date.parse(changed.serverTime),
    ).toBe(36 * 60 * 60_000);
    expect(restored.safetyPlan.nextDeadlineAt).toBe(
      changed.safetyPlan.nextDeadlineAt,
    );
  });

  it("replays account requests and disables only with an inactive projection", async () => {
    const api = createFixtureSettingsApi(session);
    const first = await api.requestAccountExport("same-key");
    const replay = await api.requestAccountExport("same-key");
    expect(replay.account.exportRequest).toEqual(first.account.exportRequest);

    const disabled = await api.disableSafetyPlan("disable-key");
    expect(disabled.safetyPlan).toEqual(
      expect.objectContaining({ state: "inactive", nextDeadlineAt: null }),
    );
  });
});
