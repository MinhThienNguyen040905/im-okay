export type AuthenticatedActor = {
  role: "authenticated";
  userId: string;
};

export type Authorize = (request: Request) => AuthenticatedActor | null;

type JwtPayload = {
  role?: unknown;
  sub?: unknown;
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
};

export const requirePlatformVerifiedUser: Authorize = (request) => {
  // config.toml keeps verify_jwt=true for this function. This decoder only reads
  // claims after the Supabase gateway has verified the JWT signature and expiry.
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as JwtPayload;
    if (
      payload.role !== "authenticated" ||
      typeof payload.sub !== "string" ||
      payload.sub.length === 0
    ) {
      return null;
    }
    return { role: "authenticated", userId: payload.sub };
  } catch {
    return null;
  }
};
