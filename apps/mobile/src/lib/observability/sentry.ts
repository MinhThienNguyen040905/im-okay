import * as Sentry from "@sentry/react-native";

import { env } from "@/config/env";
import { sanitizeForTelemetry, sanitizeTelemetryText } from "./logger";

let initialized = false;

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
    beforeSend(event) {
      delete event.user;

      if (event.message) {
        event.message = sanitizeTelemetryText(event.message);
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
          data: sanitizeForTelemetry(breadcrumb.data) as Record<
            string,
            unknown
          >,
        }));
      }

      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
        delete event.request.query_string;
        delete event.request.url;
      }

      event.extra = sanitizeForTelemetry(event.extra) as Record<
        string,
        unknown
      >;
      return event;
    },
  });
};

export const captureException = (error: unknown) => {
  if (env.sentryDsn) {
    Sentry.captureException(error);
  }
};

export { Sentry };
