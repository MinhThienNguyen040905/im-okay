import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800;

const safeKey = (key: string) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

const chunkKey = (key: string, index: number) =>
  `imokay.auth.${safeKey(key)}.${index}`;

const countKey = (key: string) => `imokay.auth.${safeKey(key)}.count`;

export const secureAuthStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }

    const countValue = await SecureStore.getItemAsync(countKey(key));
    if (!countValue) return null;

    const count = Number.parseInt(countValue, 10);
    if (!Number.isSafeInteger(count) || count < 1) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );

    return chunks.every((chunk) => chunk !== null) ? chunks.join("") : null;
  },

  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }

    const oldCount = Number.parseInt(
      (await SecureStore.getItemAsync(countKey(key))) ?? "0",
      10,
    );
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "gs")) ?? [""];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk),
      ),
    );
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));

    if (oldCount > chunks.length) {
      await Promise.all(
        Array.from({ length: oldCount - chunks.length }, (_, offset) =>
          SecureStore.deleteItemAsync(chunkKey(key, chunks.length + offset)),
        ),
      );
    }
  },

  async removeItem(key: string) {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }

    const count = Number.parseInt(
      (await SecureStore.getItemAsync(countKey(key))) ?? "0",
      10,
    );
    await Promise.all([
      SecureStore.deleteItemAsync(countKey(key)),
      ...Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    ]);
  },
};
