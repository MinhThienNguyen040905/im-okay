import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { z } from "zod";

import { CheckInApiError } from "./types";

const RETRY_WINDOW_MS = 15 * 60_000;
const attemptSchema = z.object({
  idempotencyKey: z.uuid(),
  createdAtMs: z.number().int().nonnegative(),
});

const storageKey = (userId: string) => `imokay.check-in-attempt.${userId}.v1`;

export const getOrCreateCheckInAttempt = async (
  userId: string,
  nowMs = Date.now(),
) => {
  const key = storageKey(userId);
  const saved = attemptSchema.safeParse(
    JSON.parse((await AsyncStorage.getItem(key)) ?? "null"),
  );

  if (saved.success && nowMs - saved.data.createdAtMs <= RETRY_WINDOW_MS) {
    return saved.data.idempotencyKey;
  }

  const next = {
    idempotencyKey: Crypto.randomUUID(),
    createdAtMs: nowMs,
  };
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next.idempotencyKey;
};

export const clearCheckInAttempt = (userId: string) =>
  AsyncStorage.removeItem(storageKey(userId));

export const shouldRetainCheckInAttempt = (error: unknown) =>
  error instanceof CheckInApiError && error.retryable;
