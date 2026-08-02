import type { DeliveryStatus } from "./types";

export const formatAlertCountdown = (remainingMs: number | null) => {
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
) => {
  if (!timestamp) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
};

export const deliveryStatusCopy: Record<DeliveryStatus, string> = {
  not_started: "Chưa bắt đầu gửi thông báo.",
  queued: "Máy chủ đã tiếp nhận và đang xếp hàng gửi thông báo.",
  partial: "Một phần thông báo đã gửi; hệ thống đang thử lại các kênh còn lỗi.",
  sent: "Thông báo đã được gửi; chưa có nghĩa người nhận đã đọc hoặc đang xử lý.",
  failed: "Chưa gửi được thông báo. Hệ thống cần thử lại hoặc được kiểm tra.",
};

export const channelsCopy = (channels: ("push" | "email")[]) => {
  if (channels.length === 0) return "Chưa có kênh";
  return channels
    .map((channel) => (channel === "push" ? "Push" : "Email"))
    .join(" và ");
};
