import type { DeliveryStatus } from "./types";
import {
  getLocaleTag,
  translate,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import type { TranslationKey } from "@/features/i18n/messages";

export const formatAlertCountdown = (
  remainingMs: number | null,
  _locale: AppLocale = "vi",
) => {
  if (remainingMs === null) return "--:--:--";
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};

export const formatAlertTimestamp = (
  timestamp: string | null,
  timezone: string,
  locale: AppLocale = "vi",
) => {
  if (!timestamp)
    return translate("alerts.timestampEmpty", "Chưa có", {}, locale);
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
};

export const deliveryStatusText = (
  status: DeliveryStatus,
  locale: AppLocale = "vi",
) => {
  const copy: Record<DeliveryStatus, [TranslationKey, string]> = {
    not_started: ["alerts.deliveryNotStarted", "Chưa bắt đầu gửi thông báo."],
    queued: [
      "alerts.deliveryQueued",
      "Máy chủ đã tiếp nhận và đang xếp hàng gửi thông báo.",
    ],
    partial: [
      "alerts.deliveryPartial",
      "Một phần thông báo đã gửi; hệ thống đang thử lại các kênh còn lỗi.",
    ],
    sent: [
      "alerts.deliverySent",
      "Thông báo đã được gửi; chưa có nghĩa người nhận đã đọc hoặc đang xử lý.",
    ],
    failed: [
      "alerts.deliveryFailed",
      "Chưa gửi được thông báo. Hệ thống cần thử lại hoặc được kiểm tra.",
    ],
  };
  const [key, fallback] = copy[status];
  return translate(key, fallback, {}, locale);
};

export const deliveryStatusCopy: Record<DeliveryStatus, string> = {
  not_started: "Chưa bắt đầu gửi thông báo.",
  queued: "Máy chủ đã tiếp nhận và đang xếp hàng gửi thông báo.",
  partial: "Một phần thông báo đã gửi; hệ thống đang thử lại các kênh còn lỗi.",
  sent: "Thông báo đã được gửi; chưa có nghĩa người nhận đã đọc hoặc đang xử lý.",
  failed: "Chưa gửi được thông báo. Hệ thống cần thử lại hoặc được kiểm tra.",
};

export const channelsCopy = (
  channels: ("push" | "email")[],
  locale: AppLocale = "vi",
) => {
  if (channels.length === 0)
    return translate("alerts.noChannels", "Chưa có kênh", {}, locale);
  return channels
    .map((channel) =>
      translate(
        channel === "push" ? "history.push" : "history.email",
        channel === "push" ? "Push" : "Email",
        {},
        locale,
      ),
    )
    .reduce((left, right) =>
      translate(
        "history.channels",
        "{first} và {second}",
        { first: left, second: right },
        locale,
      ),
    );
};
