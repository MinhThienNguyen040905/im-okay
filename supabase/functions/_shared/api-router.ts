import type { Authorize, AuthenticatedActor } from "./auth.ts";
import { requirePlatformVerifiedUser } from "./auth.ts";
import type { Clock } from "./clock.ts";
import { systemClock } from "./clock.ts";
import {
  createServiceRoleDatabaseGateway,
  DatabaseError,
  type DatabaseGateway,
  type RpcName,
} from "./database.ts";
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  parseJson,
  type ErrorCode,
  type JsonSchema,
} from "./http.ts";
import { logEvent } from "./logger.ts";
import {
  createNotificationDispatcher,
  type NotificationDispatcher,
} from "./notification-dispatcher.ts";
import {
  enforceRequestRateLimit,
  type RateLimitPolicy,
  type RequestRateLimiter,
} from "./rate-limit.ts";

export type ApiRouterOptions = {
  authorize?: Authorize;
  clock?: Clock;
  database?: DatabaseGateway;
  dispatcher?: NotificationDispatcher;
  rateLimiter?: RequestRateLimiter;
};

type JsonObject = Record<string, unknown>;

const objectSchema = <T extends JsonObject>(
  validator: (value: JsonObject) => value is T,
): JsonSchema<T> => ({
  safeParse(value) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      validator(value as JsonObject)
    ) {
      return { success: true, data: value as T };
    }
    return { success: false };
  },
});

type ProfileBody = { displayName: string; timezone: string };
const profileSchema = objectSchema<ProfileBody>(
  (value): value is ProfileBody =>
    typeof value.displayName === "string" && typeof value.timezone === "string",
);

type DeviceBody = { expoPushToken: string; platform: "android" | "ios" };
const deviceSchema = objectSchema<DeviceBody>(
  (value): value is DeviceBody =>
    typeof value.expoPushToken === "string" &&
    (value.platform === "android" || value.platform === "ios"),
);

type DisableDeviceBody = { expoPushToken: string };
const disableDeviceSchema = objectSchema<DisableDeviceBody>(
  (value): value is DisableDeviceBody =>
    typeof value.expoPushToken === "string",
);

type SafetyPlanBody = { checkInIntervalHours: 24 | 36 | 48 };
const safetyPlanSchema = objectSchema<SafetyPlanBody>(
  (value): value is SafetyPlanBody =>
    value.checkInIntervalHours === 24 ||
    value.checkInIntervalHours === 36 ||
    value.checkInIntervalHours === 48,
);

type DisableSafetyPlanBody = { confirmation: "disable_safety_plan" };
const disableSafetyPlanSchema = objectSchema<DisableSafetyPlanBody>(
  (value): value is DisableSafetyPlanBody =>
    value.confirmation === "disable_safety_plan",
);

type CheckInBody = { source: "mobile" };
const checkInSchema = objectSchema<CheckInBody>(
  (value): value is CheckInBody => value.source === "mobile",
);

type ContactBody = {
  consentConfirmed: true;
  displayName: string;
  email: string;
};
const contactSchema = objectSchema<ContactBody>(
  (value): value is ContactBody =>
    value.consentConfirmed === true &&
    typeof value.displayName === "string" &&
    typeof value.email === "string",
);

type ReorderBody = { orderedContactIds: string[] };
const reorderSchema = objectSchema<ReorderBody>(
  (value): value is ReorderBody =>
    Array.isArray(value.orderedContactIds) &&
    value.orderedContactIds.every((id) => typeof id === "string"),
);

type SnoozeBody = { durationHours: 1 | 4 | 8 };
const snoozeSchema = objectSchema<SnoozeBody>(
  (value): value is SnoozeBody =>
    value.durationHours === 1 ||
    value.durationHours === 4 ||
    value.durationHours === 8,
);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePath = (pathname: string): string => {
  const v1Index = pathname.lastIndexOf("/v1/");
  return v1Index >= 0 ? pathname.slice(v1Index) : pathname;
};

const idempotencyKey = (request: Request): string | null => {
  const key = request.headers.get("idempotency-key")?.trim();
  return key && key.length <= 200 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(key)
    ? key
    : null;
};

type ErrorMapping = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  status: number;
};

const databaseErrorMapping = (error: DatabaseError): ErrorMapping => {
  const code = error.databaseCode.split("|")[0];
  switch (code) {
    case "ACCOUNT_DISABLED":
      return {
        code: "ACCOUNT_DISABLED",
        message: "Tài khoản này hiện không thể thực hiện thao tác.",
        retryable: false,
        status: 403,
      };
    case "PLAN_INACTIVE":
      return {
        code: "PLAN_INACTIVE",
        message: "Kế hoạch an toàn chưa được bật.",
        retryable: false,
        status: 409,
      };
    case "SAFETY_PLAN_INACTIVE":
      return {
        code,
        message: "Kế hoạch an toàn hiện không hoạt động.",
        retryable: false,
        status: 409,
      };
    case "CONTACT_DUPLICATE":
      return {
        code,
        message: "Email đã có trong danh sách.",
        retryable: false,
        status: 409,
      };
    case "CONTACT_LIMIT_REACHED":
      return {
        code,
        message: "Danh sách đã đủ ba liên hệ.",
        retryable: false,
        status: 409,
      };
    case "CONTACT_NOT_FOUND":
      return {
        code,
        message: "Không tìm thấy liên hệ.",
        retryable: false,
        status: 404,
      };
    case "CONTACT_REORDER_CONFLICT":
      return {
        code,
        message: "Danh sách liên hệ đã thay đổi.",
        retryable: false,
        status: 409,
      };
    case "INVITATION_ALREADY_ACCEPTED":
      return {
        code,
        message: "Lời mời đã được chấp nhận.",
        retryable: false,
        status: 409,
      };
    case "INVITATION_COOLDOWN":
      return {
        code,
        message: "Chưa thể gửi lại lời mời.",
        retryable: true,
        status: 429,
      };
    case "NO_ELIGIBLE_CONTACTS":
      return {
        code,
        message: "Chưa có liên hệ đã xác nhận.",
        retryable: false,
        status: 409,
      };
    case "ALERT_ALREADY_ACTIVE":
      return {
        code,
        message: "Một cảnh báo khác đang được xử lý.",
        retryable: false,
        status: 409,
      };
    case "SNOOZE_NOT_ALLOWED":
      return {
        code,
        message: "Không thể tạm hoãn ở trạng thái hiện tại.",
        retryable: false,
        status: 409,
      };
    case "PLAN_NOT_FOUND":
    case "PROFILE_NOT_FOUND":
    case "DEVICE_NOT_FOUND":
      return {
        code: "NOT_FOUND",
        message: "Không tìm thấy tài nguyên.",
        retryable: false,
        status: 404,
      };
    case "IDEMPOTENCY_CONFLICT":
      return {
        code: "CONFLICT",
        message: "Khóa yêu cầu đã được dùng cho một nội dung khác.",
        retryable: false,
        status: 409,
      };
    case "DATABASE_UNAVAILABLE":
      return {
        code: "INTERNAL_ERROR",
        message: "Máy chủ tạm thời chưa thể xử lý yêu cầu.",
        retryable: true,
        status: 503,
      };
    case "INVALID_DISPLAY_NAME":
    case "INVALID_TIMEZONE":
    case "INVALID_PLATFORM":
    case "INVALID_PUSH_TOKEN":
    case "INVALID_INTERVAL":
    case "INVALID_IDEMPOTENCY_KEY":
    case "INVALID_CHECK_IN_SOURCE":
    case "INVALID_CONTACT":
    case "INVALID_CURSOR":
    case "INVALID_ALERT_SOURCE":
    case "INVALID_SNOOZE_DURATION":
    case "PROFILE_INCOMPLETE":
      return {
        code: "INVALID_REQUEST",
        message: "Dữ liệu gửi lên không hợp lệ.",
        retryable: false,
        status: 400,
      };
    default:
      return {
        code: "INTERNAL_ERROR",
        message: "Máy chủ chưa thể hoàn tất yêu cầu.",
        retryable: true,
        status: 500,
      };
  }
};

const call = async (
  database: DatabaseGateway,
  name: RpcName,
  parameters: Record<string, unknown>,
): Promise<unknown> => database.call(name, parameters);

const routeDatabaseRequest = async (
  request: Request,
  actor: AuthenticatedActor,
  database: DatabaseGateway,
  correlationId: string,
): Promise<unknown | { invalid: true }> => {
  const path = normalizePath(new URL(request.url).pathname);
  const common = {
    p_actor_user_id: actor.userId,
    p_correlation_id: correlationId,
  };

  if (path === "/v1/me" && request.method === "GET") {
    return call(database, "internal_get_onboarding_state", {
      p_actor_user_id: actor.userId,
    });
  }
  if (path === "/v1/me/settings" && request.method === "GET") {
    return call(database, "internal_get_settings", {
      p_actor_user_id: actor.userId,
    });
  }
  if (path === "/v1/me" && request.method === "PATCH") {
    const body = await parseJson(request, profileSchema).catch(() => null);
    if (!body) return { invalid: true };
    return call(database, "internal_update_profile", {
      ...common,
      p_display_name: body.displayName,
      p_timezone: body.timezone,
    });
  }
  if (path === "/v1/me/devices" && request.method === "POST") {
    const body = await parseJson(request, deviceSchema).catch(() => null);
    if (!body) return { invalid: true };
    return call(database, "internal_register_device", {
      ...common,
      p_expo_push_token: body.expoPushToken,
      p_platform: body.platform,
    });
  }
  if (path === "/v1/me/devices" && request.method === "DELETE") {
    const body = await parseJson(request, disableDeviceSchema).catch(
      () => null,
    );
    if (!body) return { invalid: true };
    return call(database, "internal_disable_device", {
      ...common,
      p_expo_push_token: body.expoPushToken,
    });
  }
  if (path === "/v1/safety-plan" && request.method === "PUT") {
    const body = await parseJson(request, safetyPlanSchema).catch(() => null);
    if (!body) return { invalid: true };
    return call(database, "internal_upsert_safety_plan", {
      ...common,
      p_interval_hours: body.checkInIntervalHours,
    });
  }
  if (path === "/v1/safety-plan/disable" && request.method === "POST") {
    const key = idempotencyKey(request);
    const body = await parseJson(request, disableSafetyPlanSchema).catch(
      () => null,
    );
    if (!key || !body) return { invalid: true };
    return call(database, "internal_disable_safety_plan", {
      ...common,
      p_idempotency_key: key,
    });
  }
  if (path === "/v1/safety-plan/status" && request.method === "GET") {
    return call(database, "internal_get_safety_status", {
      p_actor_user_id: actor.userId,
    });
  }
  if (path === "/v1/check-ins" && request.method === "POST") {
    const key = idempotencyKey(request);
    const body = await parseJson(request, checkInSchema).catch(() => null);
    if (!key || !body) return { invalid: true };
    return call(database, "internal_perform_check_in", {
      ...common,
      p_idempotency_key: key,
      p_source: body.source,
    });
  }
  if (path === "/v1/trusted-contacts" && request.method === "GET") {
    return call(database, "internal_get_trusted_contacts", {
      p_actor_user_id: actor.userId,
    });
  }
  if (path === "/v1/trusted-contacts" && request.method === "POST") {
    const body = await parseJson(request, contactSchema).catch(() => null);
    if (!body) return { invalid: true };
    return call(database, "internal_create_trusted_contact", {
      ...common,
      p_consent_confirmed: body.consentConfirmed,
      p_display_name: body.displayName,
      p_email: body.email,
    });
  }
  if (path === "/v1/trusted-contacts/reorder" && request.method === "POST") {
    const body = await parseJson(request, reorderSchema).catch(() => null);
    if (!body || !body.orderedContactIds.every((id) => uuidPattern.test(id))) {
      return { invalid: true };
    }
    return call(database, "internal_reorder_trusted_contacts", {
      ...common,
      p_ordered_contact_ids: body.orderedContactIds,
    });
  }
  const resendMatch = path.match(
    /^\/v1\/trusted-contacts\/([^/]+)\/resend-invitation$/,
  );
  if (resendMatch && request.method === "POST") {
    if (!uuidPattern.test(resendMatch[1]!)) return { invalid: true };
    return call(database, "internal_resend_contact_invitation", {
      ...common,
      p_contact_id: resendMatch[1],
    });
  }
  const contactMatch = path.match(/^\/v1\/trusted-contacts\/([^/]+)$/);
  if (contactMatch && request.method === "DELETE") {
    if (!uuidPattern.test(contactMatch[1]!)) return { invalid: true };
    return call(database, "internal_remove_trusted_contact", {
      ...common,
      p_contact_id: contactMatch[1],
    });
  }
  if (path === "/v1/alerts/current" && request.method === "GET") {
    return call(database, "internal_get_alert_context", {
      p_actor_user_id: actor.userId,
    });
  }
  if (path === "/v1/safety-plan/snooze" && request.method === "POST") {
    const key = idempotencyKey(request);
    const body = await parseJson(request, snoozeSchema).catch(() => null);
    if (!key || !body) return { invalid: true };
    return call(database, "internal_snooze_safety_plan", {
      ...common,
      p_duration_hours: body.durationHours,
      p_idempotency_key: key,
    });
  }
  if (
    (path === "/v1/alerts/sos" || path === "/v1/alerts/drill") &&
    request.method === "POST"
  ) {
    const key = idempotencyKey(request);
    if (!key) return { invalid: true };
    return call(database, "internal_start_alert", {
      ...common,
      p_idempotency_key: key,
      p_source: path.endsWith("/sos") ? "sos" : "drill",
    });
  }
  if (path === "/v1/history" && request.method === "GET") {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
    if (
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1 ||
      requestedLimit > 50
    )
      return { invalid: true };
    return call(database, "internal_get_history", {
      p_actor_user_id: actor.userId,
      p_cursor: url.searchParams.get("cursor"),
      p_limit: requestedLimit,
    });
  }
  if (
    (path === "/v1/account/export-requests" ||
      path === "/v1/account/deletion-requests") &&
    request.method === "POST"
  ) {
    const key = idempotencyKey(request);
    if (!key) return { invalid: true };
    return call(database, "internal_request_account_workflow", {
      ...common,
      p_idempotency_key: key,
      p_kind: path.includes("deletion") ? "deletion" : "export",
    });
  }
  return { invalid: true };
};

const knownPath = (path: string): boolean =>
  [
    "/v1/account/deletion-requests",
    "/v1/account/export-requests",
    "/v1/alerts/current",
    "/v1/alerts/drill",
    "/v1/alerts/sos",
    "/v1/check-ins",
    "/v1/health",
    "/v1/me",
    "/v1/me/settings",
    "/v1/me/devices",
    "/v1/safety-plan",
    "/v1/safety-plan/disable",
    "/v1/safety-plan/status",
    "/v1/safety-plan/snooze",
    "/v1/trusted-contacts",
    "/v1/trusted-contacts/reorder",
    "/v1/history",
  ].includes(path) ||
  /^\/v1\/trusted-contacts\/[^/]+(?:\/resend-invitation)?$/.test(path);

const isMethodAllowed = (path: string, method: string): boolean => {
  const methodsByPath: Record<string, string[]> = {
    "/v1/account/deletion-requests": ["POST"],
    "/v1/account/export-requests": ["POST"],
    "/v1/alerts/current": ["GET"],
    "/v1/alerts/drill": ["POST"],
    "/v1/alerts/sos": ["POST"],
    "/v1/check-ins": ["POST"],
    "/v1/history": ["GET"],
    "/v1/me": ["GET", "PATCH"],
    "/v1/me/devices": ["POST", "DELETE"],
    "/v1/me/settings": ["GET"],
    "/v1/safety-plan": ["PUT"],
    "/v1/safety-plan/disable": ["POST"],
    "/v1/safety-plan/snooze": ["POST"],
    "/v1/safety-plan/status": ["GET"],
    "/v1/trusted-contacts": ["GET", "POST"],
    "/v1/trusted-contacts/reorder": ["POST"],
  };

  if (methodsByPath[path]?.includes(method)) return true;
  if (/^\/v1\/trusted-contacts\/[^/]+\/resend-invitation$/.test(path)) {
    return method === "POST";
  }
  if (/^\/v1\/trusted-contacts\/[^/]+$/.test(path)) {
    return method === "DELETE";
  }
  return false;
};

const apiRateLimitPolicy = (
  path: string,
  method: string,
): RateLimitPolicy | null => {
  if (["GET", "OPTIONS"].includes(method)) return null;
  if (path === "/v1/check-ins") {
    return { limit: 12, scope: "api:check-in", windowSeconds: 60 };
  }
  if (path === "/v1/alerts/sos" || path === "/v1/alerts/drill") {
    return { limit: 4, scope: "api:immediate-alert", windowSeconds: 600 };
  }
  if (/\/resend-invitation$/.test(path)) {
    return { limit: 2, scope: "api:invitation-resend", windowSeconds: 300 };
  }
  if (path.startsWith("/v1/account/")) {
    return { limit: 5, scope: "api:account-workflow", windowSeconds: 3600 };
  }
  return { limit: 30, scope: "api:mutation", windowSeconds: 60 };
};

export const createApiRouter = (
  options: ApiRouterOptions = {},
): ((request: Request) => Promise<Response>) => {
  const authorize = options.authorize ?? requirePlatformVerifiedUser;
  const clock = options.clock ?? systemClock;

  return async (request) => {
    const requestId = getRequestId(request);
    const actor = authorize(request);
    if (!actor) {
      return errorResponse(
        requestId,
        401,
        "UNAUTHENTICATED",
        "Cần phiên đăng nhập hợp lệ.",
      );
    }

    const path = normalizePath(new URL(request.url).pathname);
    const recentAuthRequired =
      request.method === "POST" &&
      [
        "/v1/account/deletion-requests",
        "/v1/account/export-requests",
        "/v1/safety-plan/disable",
      ].includes(path);
    const nowSeconds = Math.floor(clock.now().getTime() / 1000);
    if (
      recentAuthRequired &&
      (actor.authTimeSeconds === undefined ||
        nowSeconds - actor.authTimeSeconds > 15 * 60)
    ) {
      return errorResponse(
        requestId,
        401,
        "REAUTHENTICATION_REQUIRED",
        "Vui lòng đăng nhập lại để tiếp tục.",
      );
    }
    if (path === "/v1/health") {
      if (request.method !== "GET") {
        return errorResponse(
          requestId,
          405,
          "METHOD_NOT_ALLOWED",
          "Phương thức không được hỗ trợ.",
        );
      }
      return jsonResponse(
        {
          contractVersion: "v1",
          serverTime: clock.now().toISOString(),
          service: "api",
          status: "ok",
        },
        { requestId, status: 200 },
      );
    }

    if (!knownPath(path)) {
      return errorResponse(
        requestId,
        404,
        "NOT_FOUND",
        "Không tìm thấy tài nguyên.",
      );
    }

    const correlationId = crypto.randomUUID();
    try {
      const database = options.database ?? createServiceRoleDatabaseGateway();
      const rateLimitPolicy = apiRateLimitPolicy(path, request.method);
      if (rateLimitPolicy) {
        const decision = await (options.rateLimiter ?? enforceRequestRateLimit)(
          database,
          request,
          `user:${actor.userId}`,
          rateLimitPolicy,
        );
        if (!decision.allowed) {
          const code =
            path === "/v1/alerts/sos"
              ? "SOS_RATE_LIMITED"
              : path === "/v1/alerts/drill"
                ? "DRILL_RATE_LIMITED"
                : "RATE_LIMITED";
          return errorResponse(
            requestId,
            429,
            code,
            "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.",
            true,
            { retryAt: decision.retryAt },
          );
        }
      }
      const result = await routeDatabaseRequest(
        request,
        actor,
        database,
        correlationId,
      );
      if (
        typeof result === "object" &&
        result !== null &&
        "invalid" in result
      ) {
        const methodAllowed = isMethodAllowed(path, request.method);
        return errorResponse(
          requestId,
          methodAllowed ? 400 : 405,
          methodAllowed ? "INVALID_REQUEST" : "METHOD_NOT_ALLOWED",
          methodAllowed
            ? "Dữ liệu gửi lên không hợp lệ."
            : "Phương thức không được hỗ trợ.",
        );
      }
      if (result && typeof result === "object" && "projection" in result) {
        const wrapped = result as {
          dispatch?: { deliveryId?: unknown };
          projection: unknown;
        };
        if (typeof wrapped.dispatch?.deliveryId === "string") {
          const dispatcher =
            options.dispatcher ?? createNotificationDispatcher(database);
          await dispatcher.dispatch(wrapped.dispatch.deliveryId).catch(() => {
            logEvent("warn", "notification.dispatch_deferred", {
              correlationId,
              deliveryId: wrapped.dispatch?.deliveryId,
              requestId,
            });
          });
        }
        return jsonResponse(wrapped.projection, { requestId, status: 200 });
      }
      return jsonResponse(result, { requestId, status: 200 });
    } catch (cause) {
      const databaseError =
        cause instanceof DatabaseError
          ? cause
          : new DatabaseError("DATABASE_ERROR");
      const mapped = databaseErrorMapping(databaseError);
      logEvent(mapped.status >= 500 ? "error" : "warn", "api.request_failed", {
        code: mapped.code,
        correlationId,
        path,
        requestId,
        status: mapped.status,
      });
      const retryAt = databaseError.databaseCode.startsWith(
        "INVITATION_COOLDOWN|",
      )
        ? databaseError.databaseCode.slice("INVITATION_COOLDOWN|".length)
        : undefined;
      return errorResponse(
        requestId,
        mapped.status,
        mapped.code,
        mapped.message,
        mapped.retryable,
        retryAt ? { retryAt } : undefined,
      );
    }
  };
};
