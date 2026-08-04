const sensitiveKey =
  /authorization|cookie|password|secret|token|emailbody|email_body/i;

const sanitizeUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(
      /\/(invitations|alerts)\/[^/]+/gi,
      "/$1/[REDACTED]",
    );
    return url.toString();
  } catch {
    return "[INVALID_URL]";
  }
};

export const sanitizeLogValue = (value: unknown, key = ""): unknown => {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (key.toLowerCase() === "url" && typeof value === "string") {
    return sanitizeUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeLogValue(childValue, childKey),
      ]),
    );
  }
  return value;
};

export const logEvent = (
  level: "error" | "info" | "warn",
  event: string,
  context: Record<string, unknown>,
): void => {
  const payload = JSON.stringify({
    context: sanitizeLogValue(context),
    event,
    level,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
};
