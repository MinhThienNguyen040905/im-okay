import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";

import type { AuthSession } from "../auth/types";
import type { DeviceInput, OnboardingApi, ProfileInput } from "./types";

const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;

const createFixtureApi = (session: AuthSession): OnboardingApi => {
  const merge = async (value: Record<string, unknown>) => {
    const key = fixtureKey(session.user.id);
    const current = JSON.parse(
      (await AsyncStorage.getItem(key)) ?? "{}",
    ) as Record<string, unknown>;
    await AsyncStorage.setItem(key, JSON.stringify({ ...current, ...value }));
  };

  return {
    saveProfile: (profile) => merge({ profile }),
    registerDevice: (device) => merge({ device }),
    saveSafetyPlan: (intervalHours) =>
      merge({ safetyPlan: { intervalHours, fixtureOnly: true } }),
  };
};

const successSchema = z.object({}).passthrough();

const createRemoteApi = (session: AuthSession): OnboardingApi => {
  const request = async (
    path: string,
    method: "PATCH" | "POST" | "PUT",
    body: unknown,
  ) => {
    const baseUrl = requireApiUrl().replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      throw new Error(
        `Máy chủ từ chối yêu cầu (${response.status})${requestId ? ` · ${requestId}` : ""}.`,
      );
    }

    if (response.status !== 204) {
      successSchema.parse(await response.json());
    }
  };

  return {
    saveProfile: (profile: ProfileInput) => request("/me", "PATCH", profile),
    registerDevice: (device: DeviceInput) =>
      request("/me/devices", "POST", device),
    saveSafetyPlan: (intervalHours) =>
      request("/safety-plan", "PUT", { checkInIntervalHours: intervalHours }),
  };
};

export const createOnboardingApi = (session: AuthSession): OnboardingApi =>
  env.dataMode === "fixture"
    ? createFixtureApi(session)
    : createRemoteApi(session);
