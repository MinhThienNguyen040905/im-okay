import { z } from "zod";

const publicEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z
    .enum(["local", "staging", "production"])
    .default("local"),
  EXPO_PUBLIC_API_URL: z.url().optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
});

const normalizeOptional = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const result = publicEnvSchema.safeParse({
  EXPO_PUBLIC_APP_ENV: normalizeOptional(process.env.EXPO_PUBLIC_APP_ENV),
  EXPO_PUBLIC_API_URL: normalizeOptional(process.env.EXPO_PUBLIC_API_URL),
  EXPO_PUBLIC_SENTRY_DSN: normalizeOptional(process.env.EXPO_PUBLIC_SENTRY_DSN),
});

if (!result.success) {
  const variableNames = result.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  throw new Error(`Cấu hình public không hợp lệ: ${variableNames}`);
}

export const env = Object.freeze({
  appEnv: result.data.EXPO_PUBLIC_APP_ENV,
  apiUrl: result.data.EXPO_PUBLIC_API_URL,
  sentryDsn: result.data.EXPO_PUBLIC_SENTRY_DSN,
});

export const requireApiUrl = () => {
  if (!env.apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL chưa được cấu hình.");
  }

  return env.apiUrl;
};
