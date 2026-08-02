import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";
import type { AuthSession } from "@/features/auth/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import { createFixtureAlertsApi } from "./fixtureApi";
import {
  alertContextProjectionSchema,
  AlertsApiError,
  type AlertContextSnapshot,
  type AlertsApi,
  type AlertSource,
} from "./types";

const REQUEST_TIMEOUT_MS = 12_000;

const errorEnvelopeSchema = z.object({
  error: z
    .object({
      code: z.string().min(1),
      requestId: z.string().optional(),
      retryable: z.boolean().optional(),
    })
    .passthrough(),
});

const errorCopy: Record<string, string> = {
  ALERT_ALREADY_ACTIVE: "Một cảnh báo khác đang được xử lý.",
  INVALID_SNOOZE_DURATION: "Khoảng tạm hoãn này không được máy chủ cho phép.",
  NO_ELIGIBLE_CONTACTS: "Chưa có liên hệ đã xác nhận để nhận thông báo.",
  SAFETY_PLAN_INACTIVE: "Kế hoạch an toàn hiện không hoạt động.",
  SNOOZE_NOT_ALLOWED: "Không thể tạm hoãn ở trạng thái cảnh báo hiện tại.",
  SOS_RATE_LIMITED: "Yêu cầu SOS đang được giới hạn. Hãy kiểm tra trạng thái.",
  DRILL_RATE_LIMITED: "Diễn tập đang được giới hạn. Vui lòng thử lại sau.",
};

const snapshot = (
  body: unknown,
  startedAtMs: number,
  receivedAtMs: number,
): AlertContextSnapshot => {
  const projection = alertContextProjectionSchema.parse(body);
  return {
    projection,
    receivedAtMs,
    clockOffsetMs: calculateServerClockOffset(
      projection.serverTime,
      startedAtMs,
      receivedAtMs,
    ),
  };
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    if (!response.ok) return null;
    throw new AlertsApiError(
      "Phản hồi máy chủ không đúng hợp đồng cảnh báo.",
      "contract",
      false,
    );
  }
};

const assertAlertSource = (
  value: AlertContextSnapshot,
  expectedSource: AlertSource,
) => {
  if (value.projection.currentAlert?.source !== expectedSource) {
    throw new AlertsApiError(
      "Máy chủ chưa xác nhận đúng loại cảnh báo.",
      "contract",
      false,
    );
  }
  return value;
};

export const createRemoteAlertsApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
): AlertsApi => {
  const request = async (
    path: string,
    options?: { method?: "GET" | "POST"; body?: unknown; key?: string },
  ) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAtMs = Date.now();
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
      const receivedAtMs = Date.now();
      const body = await readJson(response);
      if (!response.ok) {
        const parsed = errorEnvelopeSchema.safeParse(body);
        const code = parsed.success ? parsed.data.error.code : undefined;
        throw new AlertsApiError(
          (code && errorCopy[code]) ?? "Máy chủ chưa thể xử lý yêu cầu.",
          "server",
          parsed.success && typeof parsed.data.error.retryable === "boolean"
            ? parsed.data.error.retryable
            : response.status === 429 || response.status >= 500,
          code,
          parsed.success
            ? parsed.data.error.requestId
            : (response.headers.get("x-request-id") ?? undefined),
        );
      }
      return snapshot(body, startedAtMs, receivedAtMs);
    } catch (cause) {
      if (cause instanceof AlertsApiError) throw cause;
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new AlertsApiError(
          "Yêu cầu quá thời gian chờ và chưa được xác nhận.",
          "timeout",
          true,
        );
      }
      if (cause instanceof TypeError) {
        throw new AlertsApiError(
          "Không có kết nối tới máy chủ. Hành động chưa được xác nhận.",
          "offline",
          true,
        );
      }
      throw new AlertsApiError(
        "Phản hồi máy chủ không đúng hợp đồng cảnh báo.",
        "contract",
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getContext: () => request("/alerts/current"),
    snooze: async (durationHours, idempotencyKey) => {
      const value = await request("/safety-plan/snooze", {
        method: "POST",
        body: { durationHours },
        key: idempotencyKey,
      });
      if (
        value.projection.plan.state !== "snoozed" ||
        !value.projection.plan.snoozedUntil
      ) {
        throw new AlertsApiError(
          "Máy chủ chưa xác nhận thời điểm kết thúc tạm hoãn.",
          "contract",
          false,
        );
      }
      return value;
    },
    sendSos: async (idempotencyKey) =>
      assertAlertSource(
        await request("/alerts/sos", {
          method: "POST",
          key: idempotencyKey,
        }),
        "sos",
      ),
    sendDrill: async (idempotencyKey) =>
      assertAlertSource(
        await request("/alerts/drill", {
          method: "POST",
          key: idempotencyKey,
        }),
        "drill",
      ),
  };
};

export const createAlertsApi = (session: AuthSession): AlertsApi =>
  env.dataMode === "fixture"
    ? createFixtureAlertsApi(session)
    : createRemoteAlertsApi(session);
