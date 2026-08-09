import type { DatabaseGateway } from "./database.ts";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAt: string;
};

export type RateLimitPolicy = {
  limit: number;
  scope: string;
  windowSeconds: number;
};

export type RequestRateLimiter = (
  database: DatabaseGateway,
  request: Request,
  identity: string,
  policy: RateLimitPolicy,
) => Promise<RateLimitDecision>;

const environment = (name: string): string | undefined => {
  if (typeof Deno === "undefined") return undefined;
  return Deno.env.get(name)?.trim() || undefined;
};

const rateLimitSalt = (): string => {
  const configured = environment("RATE_LIMIT_HASH_SALT");
  if (configured) return configured;
  const supabaseUrl = environment("SUPABASE_URL");
  const localHostname = (() => {
    if (!supabaseUrl) return true;
    try {
      return ["127.0.0.1", "localhost", "kong"].includes(
        new URL(supabaseUrl).hostname,
      );
    } catch {
      return false;
    }
  })();
  if (localHostname) {
    return "imokay-local-rate-limit-only";
  }
  throw new TypeError("RATE_LIMIT_HASH_SALT_REQUIRED");
};

const clientAddress = (request: Request): string => {
  const platformAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (platformAddress) return platformAddress.slice(0, 128);
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (forwarded || "unknown").slice(0, 128);
};

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const parseDecision = (value: unknown): RateLimitDecision => {
  if (!value || typeof value !== "object") {
    throw new TypeError("INVALID_RATE_LIMIT_DECISION");
  }
  const candidate = value as Partial<RateLimitDecision>;
  if (
    typeof candidate.allowed !== "boolean" ||
    typeof candidate.limit !== "number" ||
    typeof candidate.remaining !== "number" ||
    typeof candidate.retryAt !== "string"
  ) {
    throw new TypeError("INVALID_RATE_LIMIT_DECISION");
  }
  return candidate as RateLimitDecision;
};

export const enforceRequestRateLimit: RequestRateLimiter = async (
  database,
  request,
  identity,
  policy,
) => {
  const subjectHash = await sha256(
    `${rateLimitSalt()}\u0000${clientAddress(request)}\u0000${identity}`,
  );
  return parseDecision(
    await database.call("internal_enforce_rate_limit", {
      p_limit: policy.limit,
      p_scope: policy.scope,
      p_subject_hash: subjectHash,
      p_window_seconds: policy.windowSeconds,
    }),
  );
};
