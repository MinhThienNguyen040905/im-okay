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

export type ApiRouterOptions = {
  authorize?: Authorize;
  clock?: Clock;
  database?: DatabaseGateway;
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
  switch (error.databaseCode) {
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
  return { invalid: true };
};

const knownPath = (path: string): boolean =>
  [
    "/v1/check-ins",
    "/v1/health",
    "/v1/me",
    "/v1/me/devices",
    "/v1/safety-plan",
    "/v1/safety-plan/disable",
    "/v1/safety-plan/status",
  ].includes(path);

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
        const methodAllowed =
          (path === "/v1/me" && ["GET", "PATCH"].includes(request.method)) ||
          (path === "/v1/me/devices" &&
            ["POST", "DELETE"].includes(request.method)) ||
          (path === "/v1/safety-plan" && request.method === "PUT") ||
          (path === "/v1/safety-plan/disable" && request.method === "POST") ||
          (path === "/v1/safety-plan/status" && request.method === "GET") ||
          (path === "/v1/check-ins" && request.method === "POST");
        return errorResponse(
          requestId,
          methodAllowed ? 400 : 405,
          methodAllowed ? "INVALID_REQUEST" : "METHOD_NOT_ALLOWED",
          methodAllowed
            ? "Dữ liệu gửi lên không hợp lệ."
            : "Phương thức không được hỗ trợ.",
        );
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
      return errorResponse(
        requestId,
        mapped.status,
        mapped.code,
        mapped.message,
        mapped.retryable,
      );
    }
  };
};
