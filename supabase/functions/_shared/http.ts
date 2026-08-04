export type ErrorCode =
  | "ACCOUNT_DISABLED"
  | "ALERT_ALREADY_ACTIVE"
  | "CONTACT_DUPLICATE"
  | "CONTACT_LIMIT_REACHED"
  | "CONTACT_NOT_FOUND"
  | "CONTACT_REORDER_CONFLICT"
  | "CONFLICT"
  | "INVITATION_ALREADY_ACCEPTED"
  | "INVITATION_COOLDOWN"
  | "INTERNAL_ERROR"
  | "INVALID_REQUEST"
  | "METHOD_NOT_ALLOWED"
  | "NO_ELIGIBLE_CONTACTS"
  | "NOT_FOUND"
  | "PLAN_INACTIVE"
  | "REAUTHENTICATION_REQUIRED"
  | "SAFETY_PLAN_INACTIVE"
  | "SNOOZE_NOT_ALLOWED"
  | "UNAUTHENTICATED";

export type ErrorEnvelope = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

export type JsonSchema<T> = {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error?: unknown };
};

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const getRequestId = (request: Request): string => {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && requestIdPattern.test(candidate)
    ? candidate
    : crypto.randomUUID();
};

export const jsonResponse = (
  body: unknown,
  init: ResponseInit & { requestId: string },
): Response => {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", init.requestId);
  return Response.json(body, { ...init, headers });
};

export const errorResponse = (
  requestId: string,
  status: number,
  code: ErrorCode,
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
): Response =>
  jsonResponse(
    {
      error: {
        code,
        message,
        requestId,
        retryable,
        ...(details ? { details } : {}),
      },
    } satisfies ErrorEnvelope,
    { requestId, status },
  );

export const parseJson = async <T>(
  request: Request,
  schema: JsonSchema<T>,
): Promise<T> => {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    throw new TypeError("JSON_CONTENT_TYPE_REQUIRED");
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new TypeError("INVALID_JSON");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new TypeError("INVALID_JSON_BODY");
  return parsed.data;
};
