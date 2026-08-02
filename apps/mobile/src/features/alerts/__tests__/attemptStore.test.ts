import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import {
  clearAlertAttempt,
  getOrCreateAlertAttempt,
  shouldRetainAlertAttempt,
} from "../attemptStore";
import { AlertsApiError } from "../types";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
const randomUUID = jest.mocked(Crypto.randomUUID);

describe("critical alert attempt store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    randomUUID.mockReset();
  });

  it("reuses the same SOS key during a retry window", async () => {
    randomUUID.mockReturnValue("11111111-1111-4111-8111-111111111111");
    const first = await getOrCreateAlertAttempt("user-1", "sos", 1_000);
    const retry = await getOrCreateAlertAttempt("user-1", "sos", 2_000);
    expect(retry).toBe(first);
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("keeps scopes separate and clears confirmed actions", async () => {
    randomUUID
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222")
      .mockReturnValueOnce("33333333-3333-4333-8333-333333333333");
    const sos = await getOrCreateAlertAttempt("user-1", "sos", 1_000);
    const drill = await getOrCreateAlertAttempt("user-1", "drill", 1_000);
    expect(drill).not.toBe(sos);
    await clearAlertAttempt("user-1", "sos");
    expect(await getOrCreateAlertAttempt("user-1", "sos", 2_000)).not.toBe(sos);
  });

  it("retains only retryable uncertain outcomes", () => {
    expect(
      shouldRetainAlertAttempt(new AlertsApiError("timeout", "timeout", true)),
    ).toBe(true);
    expect(
      shouldRetainAlertAttempt(new AlertsApiError("invalid", "server", false)),
    ).toBe(false);
  });
});
