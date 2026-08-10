import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import {
  clearSettingsAttempt,
  getOrCreateSettingsAttempt,
} from "../actionAttemptStore";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
const randomUUID = jest.mocked(Crypto.randomUUID);

describe("settings action attempt store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    randomUUID.mockReset();
  });

  it("reuses one key per action until server confirmation", async () => {
    randomUUID
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
    const first = await getOrCreateSettingsAttempt(
      "user",
      "disable-plan",
      1_000,
    );
    expect(
      await getOrCreateSettingsAttempt("user", "disable-plan", 2_000),
    ).toBe(first);
    await clearSettingsAttempt("user", "disable-plan");
    expect(
      await getOrCreateSettingsAttempt("user", "disable-plan", 3_000),
    ).not.toBe(first);
  });
});
