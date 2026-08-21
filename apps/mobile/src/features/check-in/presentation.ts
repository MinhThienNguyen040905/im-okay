import type { CheckInAlertOutcome, SafetyStatus } from "./types";
import { translate, type AppLocale } from "@/features/i18n/I18nProvider";

type AlertState = NonNullable<SafetyStatus["currentAlert"]>["state"];

const attentionStates = new Set<AlertState>([
  "warning",
  "triggering",
  "triggered",
  "acknowledged",
]);

export const isAlertAttentionState = (state?: AlertState | null): boolean =>
  Boolean(state && attentionStates.has(state));

export const formatCheckInOutcomeMessage = (
  outcome: CheckInAlertOutcome | null | undefined,
  fallback: string,
  locale: AppLocale = "vi",
): string => {
  switch (outcome?.result) {
    case "cancelled_before_notification":
      return translate(
        "checkIn.outcomeCancelled",
        "Lần xác nhận đã thành công trước khi có thông báo ra ngoài. Máy chủ đã đóng chu kỳ trước và tạo thời hạn mới.",
        {},
        locale,
      );
    case "correction_queued":
      return translate(
        "checkIn.outcomeCorrectionQueued",
        "Bạn đã xác nhận an toàn. Máy chủ đang xếp hàng gửi đính chính tới những liên hệ đã được báo.",
        {},
        locale,
      );
    case "correction_sent":
      return translate(
        "checkIn.outcomeCorrectionSent",
        "Bạn đã xác nhận an toàn và máy chủ đã gửi đính chính tới các liên hệ.",
        {},
        locale,
      );
    default:
      return fallback;
  }
};
