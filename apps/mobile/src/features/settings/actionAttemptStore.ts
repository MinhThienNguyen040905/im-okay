import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { z } from "zod";

const ATTEMPT_TTL_MS = 24 * 60 * 60_000;
const attemptSchema = z.object({
  idempotencyKey: z.uuid(),
  createdAtMs: z.number().int().nonnegative(),
});

export type SettingsAction = "disable-plan" | "account-export" | "account-deletion";
const storageKey = (userId: string, action: SettingsAction) =>
  `imokay.settings-attempt.${userId}.${action}.v1`;

export const getOrCreateSettingsAttempt = async (
  userId: string,
  action: SettingsAction,
  nowMs = Date.now(),
) => {
  const key = storageKey(userId, action);
  const saved = attemptSchema.safeParse(
    JSON.parse((await AsyncStorage.getItem(key)) ?? "null"),
  );
  if (saved.success && nowMs - saved.data.createdAtMs <= ATTEMPT_TTL_MS) {
    return saved.data.idempotencyKey;
  }
  const next = { idempotencyKey: Crypto.randomUUID(), createdAtMs: nowMs };
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next.idempotencyKey;
};

export const clearSettingsAttempt = (userId: string, action: SettingsAction) =>
  AsyncStorage.removeItem(storageKey(userId, action));
