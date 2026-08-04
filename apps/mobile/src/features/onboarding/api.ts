import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";

import type { AuthSession } from "../auth/types";
import type {
  DeviceInput,
  OnboardingApi,
  OnboardingServerState,
  ProfileInput,
} from "./types";

const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;
const timestampSchema = z.iso.datetime({ offset: true });
const intervalSchema = z.union([z.literal(24), z.literal(36), z.literal(48)]);
const onboardingStateSchema = z.object({
  serverTime: timestampSchema,
  profile: z.object({
    displayName: z.string().trim().min(1).max(80).nullable(),
    timezone: z.string().trim().min(1).max(64),
    accountState: z.enum(["active", "disabled", "deletion_requested"]),
  }),
  safetyPlan: z.object({
    state: z.enum(["active", "snoozed", "inactive"]),
    intervalHours: intervalSchema,
    lastCheckInAt: timestampSchema.nullable(),
    nextDeadlineAt: timestampSchema.nullable(),
  }),
  push: z.object({ registration: z.enum(["none", "registered"]) }),
});

type FixtureState = {
  device?: DeviceInput;
  profile?: ProfileInput;
  safetyPlan?: { intervalHours: 24 | 36 | 48 };
};

const createFixtureApi = (session: AuthSession): OnboardingApi => {
  const read = async (): Promise<FixtureState> =>
    JSON.parse(
      (await AsyncStorage.getItem(fixtureKey(session.user.id))) ?? "{}",
    ) as FixtureState;
  const merge = async (value: Partial<FixtureState>) => {
    const key = fixtureKey(session.user.id);
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ ...(await read()), ...value }),
    );
  };

  return {
    async getState() {
      const current = await read();
      const now = new Date();
      const intervalHours = current.safetyPlan?.intervalHours ?? 36;
      const active = current.safetyPlan !== undefined;
      return {
        serverTime: now.toISOString(),
        profile: {
          accountState: "active",
          displayName: current.profile?.displayName ?? null,
          timezone: current.profile?.timezone ?? "UTC",
        },
        safetyPlan: {
          intervalHours,
          lastCheckInAt: active ? now.toISOString() : null,
          nextDeadlineAt: active
            ? new Date(
                now.getTime() + intervalHours * 60 * 60 * 1000,
              ).toISOString()
            : null,
          state: active ? "active" : "inactive",
        },
        push: { registration: current.device ? "registered" : "none" },
      } satisfies OnboardingServerState;
    },
    saveProfile: (profile) => merge({ profile }),
    registerDevice: (device) => merge({ device }),
    saveSafetyPlan: (intervalHours) => merge({ safetyPlan: { intervalHours } }),
  };
};

const successSchema = z.object({}).passthrough();

export const createRemoteOnboardingApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
  publishableKey = env.supabasePublishableKey,
): OnboardingApi => {
  const request = async (
    path: string,
    method: "GET" | "PATCH" | "POST" | "PUT",
    body?: unknown,
  ): Promise<unknown> => {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const response = await fetcher(`${baseUrl}/v1${path}`, {
      method,
      headers: {
        ...(publishableKey ? { apikey: publishableKey } : {}),
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      throw new Error(
        `Máy chủ từ chối yêu cầu (${response.status})${requestId ? ` · ${requestId}` : ""}.`,
      );
    }
    return response.status === 204 ? {} : response.json();
  };

  return {
    async getState() {
      return onboardingStateSchema.parse(await request("/me", "GET"));
    },
    async saveProfile(profile: ProfileInput) {
      successSchema.parse(await request("/me", "PATCH", profile));
    },
    async registerDevice(device: DeviceInput) {
      successSchema.parse(await request("/me/devices", "POST", device));
    },
    async saveSafetyPlan(intervalHours) {
      successSchema.parse(
        await request("/safety-plan", "PUT", {
          checkInIntervalHours: intervalHours,
        }),
      );
    },
  };
};

export const createOnboardingApi = (session: AuthSession): OnboardingApi =>
  env.dataMode === "fixture"
    ? createFixtureApi(session)
    : createRemoteOnboardingApi(session);
