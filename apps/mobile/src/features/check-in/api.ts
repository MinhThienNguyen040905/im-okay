import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";
import type { AuthSession } from "@/features/auth/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import { createFixtureCheckInApi } from "./fixtureApi";
import {
  CheckInApiError,
  safetyStatusSchema,
  type CheckInApi,
  type SafetyStatusSnapshot,
} from "./types";

const REQUEST_TIMEOUT_MS = 12_000;

const snapshot = (
  body: unknown,
  startedAtMs: number,
  receivedAtMs: number,
): SafetyStatusSnapshot => {
  const status = safetyStatusSchema.parse(body);
  return {
    status,
    receivedAtMs,
    clockOffsetMs: calculateServerClockOffset(
      status.serverTime,
      startedAtMs,
      receivedAtMs,
    ),
  };
};

const errorEnvelopeSchema = z.object({
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
      requestId: z.string().optional(),
      retryable: z.boolean().optional(),
    })
    .passthrough(),
});

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    if (!response.ok) return null;
    throw new CheckInApiError(
      "Phản hồi máy chủ không đúng hợp đồng an toàn.",
      "contract",
      false,
    );
  }
};

export const createRemoteCheckInApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
): CheckInApi => {
  const request = async (
    path: string,
    options?: { idempotencyKey?: string; method?: "GET" | "POST" },
  ) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAtMs = Date.now();

    try {
      const baseUrl = apiUrl.replace(/\/$/, "");
      const response = await fetcher(`${baseUrl}/v1${path}`, {
        method: options?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
          ...(options?.idempotencyKey
            ? { "Idempotency-Key": options.idempotencyKey }
            : {}),
        },
        body:
          options?.method === "POST"
            ? JSON.stringify({ source: "mobile" })
            : undefined,
        signal: controller.signal,
      });
      const receivedAtMs = Date.now();
      const body = await readJson(response);

      if (!response.ok) {
        const parsed = errorEnvelopeSchema.safeParse(body);
        const retryable =
          parsed.success && typeof parsed.data.error.retryable === "boolean"
            ? parsed.data.error.retryable
            : response.status === 429 || response.status >= 500;
        throw new CheckInApiError(
          parsed.success
            ? parsed.data.error.message
            : "Máy chủ chưa thể xử lý yêu cầu.",
          "server",
          retryable,
          parsed.success ? parsed.data.error.code : undefined,
          parsed.success
            ? parsed.data.error.requestId
            : (response.headers.get("x-request-id") ?? undefined),
        );
      }

      return snapshot(body, startedAtMs, receivedAtMs);
    } catch (cause) {
      if (cause instanceof CheckInApiError) throw cause;
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new CheckInApiError(
          "Yêu cầu quá thời gian chờ và chưa được xác nhận.",
          "timeout",
          true,
        );
      }
      if (cause instanceof TypeError) {
        throw new CheckInApiError(
          "Không có kết nối tới máy chủ. Lần xác nhận chưa được ghi nhận.",
          "offline",
          true,
        );
      }
      throw new CheckInApiError(
        "Phản hồi máy chủ không đúng hợp đồng an toàn.",
        "contract",
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getStatus: () => request("/safety-plan/status"),
    checkIn: (idempotencyKey) =>
      request("/check-ins", { idempotencyKey, method: "POST" }),
  };
};

export const createCheckInApi = (session: AuthSession): CheckInApi =>
  env.dataMode === "fixture"
    ? createFixtureCheckInApi(session)
    : createRemoteCheckInApi(session);
