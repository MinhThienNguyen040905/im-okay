import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import {
  clearCheckInAttempt,
  getOrCreateCheckInAttempt,
  shouldRetainCheckInAttempt,
} from "../attemptStore";
import { CheckInApiError } from "../types";

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));

const randomUUID = jest.mocked(Crypto.randomUUID);

describe("check-in attempt", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    randomUUID.mockReset();
  });

  it("reuses the same idempotency key inside the retry window", async () => {
    randomUUID.mockReturnValue("11111111-1111-4111-8111-111111111111");
    const first = await getOrCreateCheckInAttempt("user-1", null, 1_000);
    const retry = await getOrCreateCheckInAttempt("user-1", null, 2_000);
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("creates a new key after the technical retry window", async () => {
    randomUUID
      .mockReturnValueOnce("11111111-1111-4111-8111-111111111111")
      .mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
    const first = await getOrCreateCheckInAttempt("user-1", null, 1_000);
    const next = await getOrCreateCheckInAttempt("user-1", null, 16 * 60_000);
    expect(next.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it("retains only retryable failures", () => {
    expect(
      shouldRetainCheckInAttempt(
        new CheckInApiError("offline", "offline", true),
      ),
    ).toBe(true);
    expect(
      shouldRetainCheckInAttempt(
        new CheckInApiError("contract", "contract", false),
      ),
    ).toBe(false);
  });

  it("clears a confirmed attempt", async () => {
    randomUUID.mockReturnValue("11111111-1111-4111-8111-111111111111");
    await getOrCreateCheckInAttempt("user-1", null, 1_000);
    await clearCheckInAttempt("user-1");
    randomUUID.mockReturnValue("22222222-2222-4222-8222-222222222222");
    expect(
      (await getOrCreateCheckInAttempt("user-1", null, 2_000)).idempotencyKey,
    ).toBe("22222222-2222-4222-8222-222222222222");
  });
});
