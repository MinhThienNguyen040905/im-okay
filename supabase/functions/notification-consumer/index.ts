import { createServiceRoleDatabaseGateway } from "../_shared/database.ts";
import { errorResponse, getRequestId, jsonResponse } from "../_shared/http.ts";
import { createNotificationDispatcher } from "../_shared/notification-dispatcher.ts";

Deno.serve(async (request) => {
  const requestId = getRequestId(request);
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET")?.trim();
  const provided = request.headers.get("x-internal-function-secret")?.trim();
  if (!expected || provided !== expected) {
    return errorResponse(
      requestId,
      401,
      "UNAUTHENTICATED",
      "Cần thông tin xác thực nội bộ.",
    );
  }
  if (request.method !== "POST") {
    return errorResponse(
      requestId,
      405,
      "METHOD_NOT_ALLOWED",
      "Phương thức không được hỗ trợ.",
    );
  }
  const database = createServiceRoleDatabaseGateway();
  const dispatched = await createNotificationDispatcher(database).dispatch();
  return jsonResponse({ dispatched }, { requestId, status: 200 });
});
