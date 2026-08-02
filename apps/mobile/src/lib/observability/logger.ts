const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|email|phone|address|location|dsn/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_VALUE = /\bBearer\s+[A-Z0-9._~+/-]+=*/gi;
const TOKEN_QUERY_VALUE = /([?&](?:token|code|key|secret)=)[^&\s]+/gi;

type LogContext = Record<string, unknown>;

export const sanitizeTelemetryText = (value: string) =>
  value
    .replace(EMAIL_VALUE, "[REDACTED_EMAIL]")
    .replace(BEARER_VALUE, "Bearer [REDACTED]")
    .replace(TOKEN_QUERY_VALUE, "$1[REDACTED]");

const sanitizeValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeTelemetryText(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : sanitizeValue(child, seen),
      ]),
    );
  }

  return typeof value === "string" ? sanitizeTelemetryText(value) : value;
};

export const sanitizeForTelemetry = (context: unknown): unknown =>
  sanitizeValue(context, new WeakSet<object>());

const write = (
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: LogContext,
) => {
  if (!__DEV__ && level !== "error") {
    return;
  }

  const payload = context ? sanitizeForTelemetry(context) : undefined;
  const method = level === "debug" ? console.debug : console[level];
  method(`[${level}] ${sanitizeTelemetryText(message)}`, payload ?? "");
};

export const logger = {
  debug: (message: string, context?: LogContext) =>
    write("debug", message, context),
  info: (message: string, context?: LogContext) =>
    write("info", message, context),
  warn: (message: string, context?: LogContext) =>
    write("warn", message, context),
  error: (message: string, context?: LogContext) =>
    write("error", message, context),
};
