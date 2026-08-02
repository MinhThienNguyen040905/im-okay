import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { z } from "zod";

import { AlertsApiError, type SnoozeDuration } from "./types";

const RETRY_WINDOW_MS = 15 * 60_000;
const attemptSchema = z.object({
  idempotencyKey: z.uuid(),
  createdAtMs: z.number().int().nonnegative(),
});

export type AlertAttemptScope = "sos" | "drill" | `snooze-${SnoozeDuration}`;

const storageKey = (userId: string, scope: AlertAttemptScope) =>
  `imokay.alert-attempt.${userId}.${scope}.v1`;

export const getOrCreateAlertAttempt = async (
  userId: string,
  scope: AlertAttemptScope,
  nowMs = Date.now(),
) => {
  const key = storageKey(userId, scope);
  const saved = attemptSchema.safeParse(
    JSON.parse((await AsyncStorage.getItem(key)) ?? "null"),
  );
  if (saved.success && nowMs - saved.data.createdAtMs <= RETRY_WINDOW_MS) {
    return saved.data.idempotencyKey;
  }

  const next = { idempotencyKey: Crypto.randomUUID(), createdAtMs: nowMs };
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next.idempotencyKey;
};

export const clearAlertAttempt = (userId: string, scope: AlertAttemptScope) =>
  AsyncStorage.removeItem(storageKey(userId, scope));

export const shouldRetainAlertAttempt = (error: unknown) =>
  error instanceof AlertsApiError && error.retryable;
