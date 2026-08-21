import type { Badge } from "@/components";
import { translate, type AppLocale } from "@/features/i18n/I18nProvider";

import type { InvitationStatus, TrustedContact } from "./types";

type BadgeVariant = NonNullable<Parameters<typeof Badge>[0]["variant"]>;

export const invitationStatusPresentation: Record<
  InvitationStatus,
  { label: string; variant: BadgeVariant }
> = {
  accepted: { label: "Đã xác nhận", variant: "success" },
  pending: { label: "Đang chờ", variant: "warning" },
  declined: { label: "Đã từ chối", variant: "danger" },
  expired: { label: "Lời mời hết hạn", variant: "danger" },
  revoked: { label: "Lời mời đã thu hồi", variant: "neutral" },
};

export const invitationStatusCopy = (
  status: InvitationStatus,
  locale: AppLocale = "vi",
) => {
  const copy: Record<
    InvitationStatus,
    readonly [
      key:
        | "contacts.statusAccepted"
        | "contacts.statusPending"
        | "contacts.statusDeclined"
        | "contacts.statusExpired"
        | "contacts.statusRevoked",
      fallback: string,
    ]
  > = {
    accepted: ["contacts.statusAccepted", "Đã xác nhận"],
    pending: ["contacts.statusPending", "Đang chờ"],
    declined: ["contacts.statusDeclined", "Đã từ chối"],
    expired: ["contacts.statusExpired", "Lời mời hết hạn"],
    revoked: ["contacts.statusRevoked", "Lời mời đã thu hồi"],
  };
  return {
    ...invitationStatusPresentation[status],
    label: translate(copy[status][0], copy[status][1], {}, locale),
  };
};

export const moveContactIds = (
  contacts: TrustedContact[],
  contactId: string,
  direction: "up" | "down",
) => {
  const ordered = [...contacts].sort(
    (left, right) => left.priority - right.priority,
  );
  const index = ordered.findIndex(({ id }) => id === contactId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered.map(({ id }) => id);
  }

  const current = ordered[index];
  const target = ordered[targetIndex];
  if (!current || !target) return ordered.map(({ id }) => id);
  ordered[index] = target;
  ordered[targetIndex] = current;
  return ordered.map(({ id }) => id);
};

export const formatResendCooldown = (
  remainingMs: number | null,
  locale: AppLocale = "vi",
) => {
  if (!remainingMs) return null;
  const seconds = Math.max(1, Math.ceil(remainingMs / 1_000));
  if (seconds < 60) {
    return translate(
      "contacts.seconds",
      "{count} giây",
      { count: seconds },
      locale,
    );
  }
  return translate(
    "contacts.minutes",
    "{count} phút",
    { count: Math.ceil(seconds / 60) },
    locale,
  );
};
