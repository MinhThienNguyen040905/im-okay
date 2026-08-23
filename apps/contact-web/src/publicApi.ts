export type LinkStatus =
  | "accepted"
  | "active"
  | "cancelled"
  | "declined"
  | "expired"
  | "invalid"
  | "pending"
  | "resolved"
  | "revoked"
  | "used";

export type InvitationProjection = {
  allowedActions: ("accept" | "decline")[];
  contactDisplayName?: string;
  expiresAt?: string;
  ownerDisplayName?: string;
  serverTime: string;
  status: LinkStatus;
};

export type AlertProjection = {
  acknowledgedAt?: string | null;
  alertReference?: string;
  allowedActions: ("acknowledge" | "cannot_help" | "resolve")[];
  contactDisplayName?: string;
  deadlineAt?: string;
  endedAt?: string | null;
  lastCheckInAt?: string | null;
  location?: {
    accuracyMeters: number;
    capturedAt: string;
    latitude: number;
    longitude: number;
    source: "check_in" | "sos";
  } | null;
  ownerDisplayName?: string;
  priority?: number;
  responseAction?: string | null;
  serverTime: string;
  source?: "deadline" | "drill" | "sos";
  status: LinkStatus;
  triggeredAt?: string | null;
};

const apiUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_PUBLIC_API_URL?.trim();
  return (
    configured || "http://127.0.0.1:54321/functions/v1/public-api"
  ).replace(/\/$/, "");
};

export class PublicApiError extends Error {}

export async function getPublicProjection<T>(
  kind: "alerts" | "invitations",
  token: string,
): Promise<T> {
  const response = await fetch(
    `${apiUrl()}/v1/public/${kind}/${encodeURIComponent(token)}`,
    {
      headers: { accept: "application/json" },
      method: "GET",
      referrerPolicy: "no-referrer",
    },
  );
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !body)
    throw new PublicApiError("Không thể tải liên kết an toàn.");
  return body;
}

export async function postPublicAction<T>(
  kind: "alerts" | "invitations",
  token: string,
  action: string,
): Promise<T> {
  const response = await fetch(
    `${apiUrl()}/v1/public/${kind}/${encodeURIComponent(token)}`,
    {
      body: JSON.stringify({ action, idempotencyKey: crypto.randomUUID() }),
      headers: { "content-type": "application/json" },
      method: "POST",
      referrerPolicy: "no-referrer",
    },
  );
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !body)
    throw new PublicApiError("Máy chủ chưa thể ghi nhận hành động.");
  return body;
}
