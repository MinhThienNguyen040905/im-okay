import {
  createServiceRoleDatabaseGateway,
  type DatabaseGateway,
} from "./database.ts";
import { errorResponse, getRequestId, jsonResponse } from "./http.ts";
import { logEvent } from "./logger.ts";

export type OpsRouterOptions = {
  database?: DatabaseGateway;
  internalSecret?: string;
};

const configuredSecret = (): string | undefined =>
  typeof Deno === "undefined"
    ? undefined
    : Deno.env.get("INTERNAL_FUNCTION_SECRET")?.trim() || undefined;

export const createOpsRouter =
  (options: OpsRouterOptions = {}): ((request: Request) => Promise<Response>) =>
  async (request) => {
    const requestId = getRequestId(request);
    const expected = options.internalSecret ?? configuredSecret();
    if (
      !expected ||
      request.headers.get("x-internal-function-secret")?.trim() !== expected
    ) {
      return errorResponse(
        requestId,
        401,
        "UNAUTHENTICATED",
        "Cần thông tin xác thực nội bộ.",
      );
    }
    if (request.method !== "GET") {
      return errorResponse(
        requestId,
        405,
        "METHOD_NOT_ALLOWED",
        "Phương thức không được hỗ trợ.",
      );
    }

    try {
      const database = options.database ?? createServiceRoleDatabaseGateway();
      const snapshot = await database.call(
        "internal_get_operational_snapshot",
        {},
      );
      return jsonResponse(snapshot, { requestId, status: 200 });
    } catch {
      logEvent("error", "ops.snapshot_failed", { requestId });
      return errorResponse(
        requestId,
        503,
        "INTERNAL_ERROR",
        "Chưa thể đọc trạng thái vận hành.",
        true,
      );
    }
  };
