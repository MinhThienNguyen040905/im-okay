import { z } from "zod";

import { env, requireApiUrl } from "@/config/env";
import type { AuthSession } from "@/features/auth/types";
import { calculateServerClockOffset } from "@/lib/time/serverClock";

import { createFixtureTrustedContactsApi } from "./fixtureApi";
import {
  TrustedContactsApiError,
  trustedContactsProjectionSchema,
  type TrustedContactsApi,
  type TrustedContactsErrorDetails,
  type TrustedContactsSnapshot,
} from "./types";

const REQUEST_TIMEOUT_MS = 12_000;

const errorEnvelopeSchema = z.object({
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().optional(),
      requestId: z.string().optional(),
      retryable: z.boolean().optional(),
      details: z
        .object({
          field: z.literal("email").optional(),
          retryAt: z.iso.datetime({ offset: true }).optional(),
        })
        .optional(),
    })
    .passthrough(),
});

const errorCopy: Record<string, string> = {
  CONTACT_DUPLICATE: "Email này đã có trong danh sách liên hệ tin cậy.",
  CONTACT_LIMIT_REACHED: "Bạn đã có đủ 3 liên hệ tin cậy.",
  CONTACT_NOT_FOUND: "Liên hệ này không còn trong danh sách.",
  CONTACT_REORDER_CONFLICT:
    "Danh sách đã thay đổi ở nơi khác. Hãy đồng bộ rồi thử lại.",
  INVITATION_ALREADY_ACCEPTED: "Liên hệ này đã chấp nhận lời mời.",
  INVITATION_COOLDOWN: "Chưa thể gửi lại lời mời. Vui lòng chờ hết thời gian.",
  RATE_LIMITED: "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.",
  RESEND_COOLDOWN: "Chưa thể gửi lại lời mời. Vui lòng chờ hết thời gian.",
};

const snapshot = (
  body: unknown,
  startedAtMs: number,
  receivedAtMs: number,
): TrustedContactsSnapshot => {
  const projection = trustedContactsProjectionSchema.parse(body);
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
    throw new TrustedContactsApiError(
      "Phản hồi máy chủ không đúng hợp đồng liên hệ.",
      "contract",
      false,
    );
  }
};

export const createRemoteTrustedContactsApi = (
  session: AuthSession,
  apiUrl = requireApiUrl(),
  fetcher: typeof fetch = fetch,
): TrustedContactsApi => {
  const request = async (
    path: string,
    options?: {
      method?: "GET" | "POST" | "DELETE";
      body?: unknown;
    },
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
        const details: TrustedContactsErrorDetails | undefined = parsed.success
          ? parsed.data.error.details
          : undefined;
        throw new TrustedContactsApiError(
          (code && errorCopy[code]) ?? "Máy chủ chưa thể xử lý yêu cầu.",
          "server",
          parsed.success && typeof parsed.data.error.retryable === "boolean"
            ? parsed.data.error.retryable
            : response.status === 429 || response.status >= 500,
          code,
          parsed.success
            ? parsed.data.error.requestId
            : (response.headers.get("x-request-id") ?? undefined),
          details,
        );
      }

      return snapshot(body, startedAtMs, receivedAtMs);
    } catch (cause) {
      if (cause instanceof TrustedContactsApiError) throw cause;
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new TrustedContactsApiError(
          "Yêu cầu quá thời gian chờ và chưa được xác nhận.",
          "timeout",
          true,
        );
      }
      if (cause instanceof TypeError) {
        throw new TrustedContactsApiError(
          "Không có kết nối tới máy chủ. Danh sách chưa được thay đổi.",
          "offline",
          true,
        );
      }
      throw new TrustedContactsApiError(
        "Phản hồi máy chủ không đúng hợp đồng liên hệ.",
        "contract",
        false,
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  const contactPath = (contactId: string) =>
    `/trusted-contacts/${encodeURIComponent(contactId)}`;

  return {
    getContacts: () => request("/trusted-contacts"),
    createContact: (input) =>
      request("/trusted-contacts", { method: "POST", body: input }),
    removeContact: (contactId) =>
      request(contactPath(contactId), { method: "DELETE" }),
    reorderContacts: (orderedContactIds) =>
      request("/trusted-contacts/reorder", {
        method: "POST",
        body: { orderedContactIds },
      }),
    resendInvitation: (contactId) =>
      request(`${contactPath(contactId)}/resend-invitation`, {
        method: "POST",
      }),
  };
};

export const createTrustedContactsApi = (
  session: AuthSession,
): TrustedContactsApi =>
  env.dataMode === "fixture"
    ? createFixtureTrustedContactsApi(session)
    : createRemoteTrustedContactsApi(session);
