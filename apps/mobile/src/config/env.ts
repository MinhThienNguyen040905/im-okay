import { z } from "zod";

const publicEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z
    .enum(["local", "staging", "production"])
    .default("local"),
  EXPO_PUBLIC_DATA_MODE: z.enum(["fixture", "remote"]).default("fixture"),
  EXPO_PUBLIC_API_URL: z.url().optional(),
  EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
});

const normalizeOptional = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const result = publicEnvSchema.safeParse({
  EXPO_PUBLIC_APP_ENV: normalizeOptional(process.env.EXPO_PUBLIC_APP_ENV),
  EXPO_PUBLIC_DATA_MODE: normalizeOptional(process.env.EXPO_PUBLIC_DATA_MODE),
  EXPO_PUBLIC_API_URL: normalizeOptional(process.env.EXPO_PUBLIC_API_URL),
  EXPO_PUBLIC_SUPABASE_URL: normalizeOptional(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
  ),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: normalizeOptional(
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  EXPO_PUBLIC_SENTRY_DSN: normalizeOptional(process.env.EXPO_PUBLIC_SENTRY_DSN),
});

if (!result.success) {
  const variableNames = result.error.issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .join(", ");

  throw new Error(`Cấu hình public không hợp lệ: ${variableNames}`);
}

if (
  result.data.EXPO_PUBLIC_DATA_MODE === "fixture" &&
  result.data.EXPO_PUBLIC_APP_ENV !== "local"
) {
  throw new Error("Chế độ fixture chỉ được phép trong môi trường local.");
}

if (
  result.data.EXPO_PUBLIC_DATA_MODE === "remote" &&
  (!result.data.EXPO_PUBLIC_API_URL ||
    !result.data.EXPO_PUBLIC_SUPABASE_URL ||
    !result.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
) {
  throw new Error(
    "Chế độ remote cần API URL, Supabase URL và publishable key.",
  );
}

export const env = Object.freeze({
  appEnv: result.data.EXPO_PUBLIC_APP_ENV,
  dataMode: result.data.EXPO_PUBLIC_DATA_MODE,
  apiUrl: result.data.EXPO_PUBLIC_API_URL,
  supabaseUrl: result.data.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: result.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  sentryDsn: result.data.EXPO_PUBLIC_SENTRY_DSN,
});

export const requireApiUrl = () => {
  if (!env.apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL chưa được cấu hình.");
  }

  return env.apiUrl;
};

export const requireSupabaseConfig = () => {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase Auth chưa được cấu hình.");
  }

  return {
    publishableKey: env.supabasePublishableKey,
    url: env.supabaseUrl,
  };
};
