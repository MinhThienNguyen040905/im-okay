import { createServiceRoleDatabaseGateway } from "../_shared/database.ts";
import { errorResponse, getRequestId, jsonResponse } from "../_shared/http.ts";
import { getExpoReceipts } from "../_shared/notification-providers.ts";

Deno.serve(async (request) => {
  const requestId = getRequestId(request);
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET")?.trim();
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
  if (request.method !== "POST") {
    return errorResponse(
      requestId,
      405,
      "METHOD_NOT_ALLOWED",
      "Phương thức không được hỗ trợ.",
    );
  }
  if (Deno.env.get("NOTIFICATION_PROVIDER_MODE")?.trim() !== "live") {
    return jsonResponse(
      { checked: 0, requested: 0 },
      { requestId, status: 200 },
    );
  }
  const database = createServiceRoleDatabaseGateway();
  const rawIds = await database.call("internal_claim_expo_receipts", {
    p_batch_size: 1000,
  });
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string")
    : [];
  const receipts = await getExpoReceipts(ids);
  for (const [providerMessageId, receipt] of receipts) {
    await database.call("internal_record_expo_receipt", {
      p_error_code: receipt.errorCode ?? null,
      p_provider_message_id: providerMessageId,
      p_status: receipt.status,
    });
  }
  return jsonResponse(
    { checked: receipts.size, requested: ids.length },
    { requestId, status: 200 },
  );
});
