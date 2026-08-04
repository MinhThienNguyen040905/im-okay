import type { Clock } from "./clock.ts";
import { systemClock } from "./clock.ts";
import { errorResponse, getRequestId, jsonResponse } from "./http.ts";

export type PublicApiRouterOptions = {
  clock?: Clock;
};

const isHealthPath = (pathname: string): boolean =>
  pathname === "/v1/health" || pathname.endsWith("/public-api/v1/health");

export const createPublicApiRouter = (
  options: PublicApiRouterOptions = {},
): ((request: Request) => Promise<Response>) => {
  const clock = options.clock ?? systemClock;

  return async (request) => {
    const requestId = getRequestId(request);
    const { pathname } = new URL(request.url);
    if (!isHealthPath(pathname)) {
      return errorResponse(
        requestId,
        404,
        "NOT_FOUND",
        "Không tìm thấy tài nguyên.",
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

    return jsonResponse(
      {
        contractVersion: "v1",
        serverTime: clock.now().toISOString(),
        service: "public-api",
        status: "ok",
      },
      { requestId, status: 200 },
    );
  };
};
