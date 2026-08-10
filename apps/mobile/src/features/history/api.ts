import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";
import type { AuthSession } from "@/features/auth/types";

import { createFixtureHistoryApi } from "./fixtureApi";
import { HistoryApiError, historyPageSchema, type HistoryApi } from "./types";

const REQUEST_TIMEOUT_MS = 12_000;
const errorEnvelopeSchema = z.object({
  error: z.object({ message: z.string().min(1) }).passthrough(),
});

export const createRemoteHistoryApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
): HistoryApi => ({
  async getHistory(cursor, limit = 20) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set("cursor", cursor);
      const response = await fetcher(
        `${apiUrl.replace(/\/$/, "")}/v1/history?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const parsed = errorEnvelopeSchema.safeParse(body);
        throw new HistoryApiError(
          parsed.success
            ? parsed.data.error.message
            : "Máy chủ chưa thể tải lịch sử.",
          "server",
          response.status === 429 || response.status >= 500,
          response.headers.get("x-request-id") ?? undefined,
        );
      }
      try {
        return historyPageSchema.parse(body);
      } catch {
        throw new HistoryApiError(
          "Phản hồi lịch sử không đúng hợp đồng an toàn.",
          "contract",
          false,
        );
      }
    } catch (cause) {
      if (cause instanceof HistoryApiError) throw cause;
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new HistoryApiError(
          "Yêu cầu lịch sử quá thời gian chờ.",
          "timeout",
          true,
        );
      }
      if (cause instanceof TypeError) {
        throw new HistoryApiError(
          "Không có kết nối tới máy chủ.",
          "offline",
          true,
        );
      }
      throw new HistoryApiError(
        "Phản hồi lịch sử không đúng hợp đồng an toàn.",
        "contract",
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
});

export const createHistoryApi = (session: AuthSession): HistoryApi =>
  env.dataMode === "fixture"
    ? createFixtureHistoryApi(session)
    : createRemoteHistoryApi(session);
