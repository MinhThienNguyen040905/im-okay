import * as Sentry from "@sentry/react-native";
import type { ErrorEvent } from "@sentry/react-native";

import { env } from "@/config/env";
import { sanitizeForTelemetry, sanitizeTelemetryText } from "./logger";

let initialized = false;

export const sanitizeSentryEvent = (event: ErrorEvent) => {
  delete event.user;
  delete event.server_name;

  if (event.message) {
    event.message = sanitizeTelemetryText(event.message);
  }
  if (event.transaction) {
    event.transaction = sanitizeTelemetryText(event.transaction);
  }
  if (event.fingerprint) {
    event.fingerprint = event.fingerprint.map(sanitizeTelemetryText);
  }
  if (event.logentry?.message) {
    event.logentry.message = sanitizeTelemetryText(event.logentry.message);
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((value) => ({
      ...value,
      value: value.value ? sanitizeTelemetryText(value.value) : value.value,
    }));
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: breadcrumb.message
        ? sanitizeTelemetryText(breadcrumb.message)
        : breadcrumb.message,
      data: sanitizeForTelemetry(breadcrumb.data) as Record<string, unknown>,
    }));
  }

  // Request URLs can contain auth/public tokens in path, query or fragment.
  // Dropping the whole request is safer than trying to enumerate providers.
  delete event.request;
  event.contexts = sanitizeForTelemetry(
    event.contexts,
  ) as typeof event.contexts;
  event.extra = sanitizeForTelemetry(event.extra) as typeof event.extra;
  event.tags = sanitizeForTelemetry(event.tags) as typeof event.tags;
  return event;
};

export const initializeSentry = () => {
  if (initialized) {
    return;
  }

  initialized = true;

  Sentry.init({
    dsn: env.sentryDsn,
    enabled: Boolean(env.sentryDsn),
    environment: env.appEnv,
    sendDefaultPii: false,
    tracesSampleRate: env.appEnv === "production" ? 0.1 : 0,
    beforeSend: sanitizeSentryEvent,
  });
};

export const captureException = (error: unknown) => {
  if (env.sentryDsn) {
    Sentry.captureException(error);
  }
};

export { Sentry };
