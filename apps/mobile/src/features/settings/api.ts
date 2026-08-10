import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";
import type { AuthSession } from "@/features/auth/types";

import { createFixtureSettingsApi } from "./fixtureApi";
import {
  SettingsApiError,
  settingsProjectionSchema,
  type SettingsApi,
} from "./types";

const REQUEST_TIMEOUT_MS = 12_000;
const errorEnvelopeSchema = z.object({
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().min(1),
      retryable: z.boolean().optional(),
      requestId: z.string().optional(),
    })
    .passthrough(),
});

export const createRemoteSettingsApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
): SettingsApi => {
  const request = async (
    path: string,
    options?: {
      method?: "GET" | "PATCH" | "PUT" | "POST";
      body?: unknown;
      key?: string;
    },
  ) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetcher(`${apiUrl.replace(/\/$/, "")}/v1${path}`, {
        method: options?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
          ...(options?.key ? { "Idempotency-Key": options.key } : {}),
        },
        body:
          options?.body === undefined
            ? undefined
            : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const parsed = errorEnvelopeSchema.safeParse(body);
        throw new SettingsApiError(
          parsed.success
            ? parsed.data.error.message
            : "Máy chủ chưa thể cập nhật cài đặt.",
          "server",
          parsed.success
            ? (parsed.data.error.retryable ?? false)
            : response.status === 429 || response.status >= 500,
          parsed.success ? parsed.data.error.code : undefined,
          parsed.success
            ? parsed.data.error.requestId
            : (response.headers.get("x-request-id") ?? undefined),
        );
      }
      try {
        return settingsProjectionSchema.parse(body);
      } catch {
        throw new SettingsApiError(
          "Phản hồi cài đặt không đúng hợp đồng an toàn.",
          "contract",
          false,
        );
      }
    } catch (cause) {
      if (cause instanceof SettingsApiError) throw cause;
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new SettingsApiError(
          "Yêu cầu quá thời gian chờ.",
          "timeout",
          true,
        );
      }
      if (cause instanceof TypeError) {
        throw new SettingsApiError(
          "Không có kết nối tới máy chủ.",
          "offline",
          true,
        );
      }
      throw new SettingsApiError(
        "Phản hồi cài đặt không đúng hợp đồng an toàn.",
        "contract",
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  const requireResult = async (
    result: Promise<Awaited<ReturnType<typeof request>>>,
    valid: (projection: Awaited<ReturnType<typeof request>>) => boolean,
  ) => {
    const projection = await result;
    if (!valid(projection)) {
      throw new SettingsApiError(
        "Máy chủ chưa xác nhận đúng trạng thái được yêu cầu.",
        "contract",
        false,
      );
    }
    return projection;
  };

  return {
    getSettings: () => request("/me/settings"),
    updateProfile: (input) =>
      requireResult(
        request("/me", { method: "PATCH", body: input }),
        ({ profile }) =>
          profile.displayName === input.displayName.trim() &&
          profile.timezone === input.timezone.trim(),
      ),
    updateSafetyPlan: (intervalHours) =>
      requireResult(
        request("/safety-plan", {
          method: "PUT",
          body: { checkInIntervalHours: intervalHours },
        }),
        ({ safetyPlan }) =>
          safetyPlan.intervalHours === intervalHours &&
          safetyPlan.state !== "inactive" &&
          safetyPlan.nextDeadlineAt !== null,
      ),
    disableSafetyPlan: (key) =>
      requireResult(
        request("/safety-plan/disable", {
          method: "POST",
          body: { confirmation: "disable_safety_plan" },
          key,
        }),
        ({ safetyPlan }) =>
          safetyPlan.state === "inactive" && safetyPlan.nextDeadlineAt === null,
      ),
    requestAccountExport: (key) =>
      requireResult(
        request("/account/export-requests", { method: "POST", body: {}, key }),
        ({ account }) => account.exportRequest !== null,
      ),
    requestAccountDeletion: (key) =>
      requireResult(
        request("/account/deletion-requests", {
          method: "POST",
          body: { confirmation: "request_account_deletion" },
          key,
        }),
        ({ account }) => account.deletionRequest !== null,
      ),
  };
};

export const createSettingsApi = (session: AuthSession): SettingsApi =>
  env.dataMode === "fixture"
    ? createFixtureSettingsApi(session)
    : createRemoteSettingsApi(session);
