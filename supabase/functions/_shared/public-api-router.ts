import type { Clock } from "./clock.ts";
import { systemClock } from "./clock.ts";
import {
  createServiceRoleDatabaseGateway,
  DatabaseError,
  type DatabaseGateway,
} from "./database.ts";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  parseJson,
} from "./http.ts";
import { logEvent } from "./logger.ts";
import {
  enforceRequestRateLimit,
  type RequestRateLimiter,
} from "./rate-limit.ts";

export type PublicApiRouterOptions = {
  allowedOrigins?: string[];
  clock?: Clock;
  database?: DatabaseGateway;
  rateLimiter?: RequestRateLimiter;
};

type PublicActionBody = {
  action: "accept" | "acknowledge" | "cannot_help" | "decline" | "resolve";
  idempotencyKey: string;
};

const publicActionSchema = {
  safeParse(value: unknown) {
    if (!value || typeof value !== "object") return { success: false } as const;
    const body = value as Partial<PublicActionBody>;
    const validActions = [
      "accept",
      "acknowledge",
      "cannot_help",
      "decline",
      "resolve",
    ];
    if (
      typeof body.action === "string" &&
      validActions.includes(body.action) &&
      typeof body.idempotencyKey === "string" &&
      body.idempotencyKey.length >= 1 &&
      body.idempotencyKey.length <= 200
    ) {
      return { success: true, data: body as PublicActionBody } as const;
    }
    return { success: false } as const;
  },
};

const normalizePath = (pathname: string): string => {
  const index = pathname.lastIndexOf("/v1/");
  return index >= 0 ? pathname.slice(index) : pathname;
};

const securityHeaders = (response: Response, origin?: string): Response => {
  const headers = new Headers(response.headers);
  headers.set(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  headers.set("cross-origin-resource-policy", "same-site");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

export const createPublicApiRouter = (
  options: PublicApiRouterOptions = {},
): ((request: Request) => Promise<Response>) => {
  const clock = options.clock ?? systemClock;
  const allowedOrigins =
    options.allowedOrigins ??
    (
      (typeof Deno === "undefined"
        ? undefined
        : Deno.env.get("PUBLIC_CONTACT_WEB_ORIGINS")) ??
      "http://127.0.0.1:8082,http://localhost:8082"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

  return async (request) => {
    const requestId = getRequestId(request);
    const path = normalizePath(new URL(request.url).pathname);
    const requestOrigin = request.headers.get("origin")?.trim();
    const allowedOrigin =
      requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : undefined;
    if (requestOrigin && !allowedOrigin) {
      return securityHeaders(
        errorResponse(
          requestId,
          403,
          "UNAUTHENTICATED",
          "Nguồn yêu cầu không được phép.",
        ),
      );
    }
    if (request.method === "OPTIONS") {
      const response = new Response(null, {
        headers: {
          "access-control-allow-headers": "content-type,x-request-id",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
        status: 204,
      });
      return securityHeaders(response, allowedOrigin);
    }

    if (path === "/v1/health") {
      if (request.method !== "GET") {
        return securityHeaders(
          errorResponse(
            requestId,
            405,
            "METHOD_NOT_ALLOWED",
            "Phương thức không được hỗ trợ.",
          ),
          allowedOrigin,
        );
      }
      return securityHeaders(
        jsonResponse(
          {
            contractVersion: "v1",
            serverTime: clock.now().toISOString(),
            service: "public-api",
            status: "ok",
          },
          { requestId, status: 200 },
        ),
        allowedOrigin,
      );
    }

    const invitation = path.match(/^\/v1\/public\/invitations\/([^/]+)$/);
    const alert = path.match(/^\/v1\/public\/alerts\/([^/]+)$/);
    if (!invitation && !alert) {
      return securityHeaders(
        errorResponse(
          requestId,
          404,
          "NOT_FOUND",
          "Không tìm thấy tài nguyên.",
        ),
        allowedOrigin,
      );
    }
    if (!["GET", "POST"].includes(request.method)) {
      return securityHeaders(
        errorResponse(
          requestId,
          405,
          "METHOD_NOT_ALLOWED",
          "Phương thức không được hỗ trợ.",
        ),
        allowedOrigin,
      );
    }
    const correlationId = crypto.randomUUID();
    try {
      const database = options.database ?? createServiceRoleDatabaseGateway();
      const rateLimitPolicy =
        request.method === "GET"
          ? { limit: 60, scope: "public:projection", windowSeconds: 300 }
          : { limit: 10, scope: "public:action", windowSeconds: 300 };
      const decision = await (options.rateLimiter ?? enforceRequestRateLimit)(
        database,
        request,
        invitation ? "public:invitation" : "public:alert",
        rateLimitPolicy,
      );
      if (!decision.allowed) {
        return securityHeaders(
          errorResponse(
            requestId,
            429,
            "RATE_LIMITED",
            "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.",
            true,
            { retryAt: decision.retryAt },
          ),
          allowedOrigin,
        );
      }

      const token = decodeURIComponent((invitation?.[1] ?? alert?.[1])!);
      if (token.length < 32 || token.length > 128) {
        return securityHeaders(
          jsonResponse(
            {
              serverTime: clock.now().toISOString(),
              status: "invalid",
              allowedActions: [],
            },
            { requestId, status: 200 },
          ),
          allowedOrigin,
        );
      }
      let result: unknown;
      if (request.method === "GET") {
        result = await database.call(
          invitation
            ? "internal_get_public_invitation"
            : "internal_get_public_alert",
          { p_token: token },
        );
      } else {
        const body = await parseJson(request, publicActionSchema).catch(
          () => null,
        );
        const actionAllowed = invitation
          ? body?.action === "accept" || body?.action === "decline"
          : body?.action === "acknowledge" ||
            body?.action === "resolve" ||
            body?.action === "cannot_help";
        if (!body || !actionAllowed) {
          return securityHeaders(
            errorResponse(
              requestId,
              400,
              "INVALID_REQUEST",
              "Dữ liệu gửi lên không hợp lệ.",
            ),
            allowedOrigin,
          );
        }
        result = await database.call(
          invitation
            ? "internal_consume_public_invitation"
            : "internal_consume_public_alert",
          {
            p_action: body.action,
            p_correlation_id: correlationId,
            p_idempotency_key: body.idempotencyKey,
            p_token: token,
          },
        );
      }
      return securityHeaders(
        jsonResponse(result, { requestId, status: 200 }),
        allowedOrigin,
      );
    } catch (cause) {
      const databaseCode =
        cause instanceof DatabaseError ? cause.databaseCode : "DATABASE_ERROR";
      logEvent("warn", "public_api.request_failed", {
        code: databaseCode,
        correlationId,
        path: invitation
          ? "/v1/public/invitations/[REDACTED]"
          : "/v1/public/alerts/[REDACTED]",
        requestId,
      });
      return securityHeaders(
        errorResponse(
          requestId,
          databaseCode === "INVALID_PUBLIC_ACTION" ? 400 : 503,
          databaseCode === "INVALID_PUBLIC_ACTION"
            ? "INVALID_REQUEST"
            : "INTERNAL_ERROR",
          databaseCode === "INVALID_PUBLIC_ACTION"
            ? "Dữ liệu gửi lên không hợp lệ."
            : "Máy chủ tạm thời chưa thể xử lý yêu cầu.",
          databaseCode !== "INVALID_PUBLIC_ACTION",
        ),
        allowedOrigin,
      );
    }
  };
};
