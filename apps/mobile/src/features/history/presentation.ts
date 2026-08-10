import type { HistoryEvent, HistoryFilter, HistoryItem } from "./types";

const checkInEvents = new Set<HistoryEvent>(["check_in_recorded"]);
const drillEvents = new Set<HistoryEvent>([
  "drill_triggered",
  "drill_acknowledged",
  "drill_resolved",
]);

export const historyCategory = (event: HistoryEvent) =>
  checkInEvents.has(event) ? "check_in" : "alert";

export const filterHistory = (items: HistoryItem[], filter: HistoryFilter) =>
  filter === "all"
    ? items
    : items.filter(({ event }) => historyCategory(event) === filter);

export const historyCopy = (item: HistoryItem) => {
  const channels = item.channels
    ?.map((channel) => (channel === "push" ? "Push" : "Email"))
    .join(" và ");
  const copy: Record<HistoryEvent, { title: string; detail?: string }> = {
    check_in_recorded: {
      title: "Đã xác nhận an toàn",
      detail: item.nextDeadlineAt
        ? "Máy chủ đã tạo thời hạn tiếp theo"
        : undefined,
    },
    reminder_sent: {
      title: "Đã gửi lời nhắc",
      detail: channels ? `Kênh: ${channels}` : undefined,
    },
    snooze_applied: {
      title: "Đã tạm hoãn bảo vệ",
      detail: item.durationHours
        ? `Trong ${item.durationHours} giờ`
        : undefined,
    },
    alert_triggered: { title: "Cảnh báo đã được kích hoạt" },
    alert_acknowledged: { title: "Máy chủ đã nhận cảnh báo" },
    alert_resolved: { title: "Cảnh báo đã kết thúc" },
    contact_response_received: {
      title: "Đã nhận phản hồi từ liên hệ tin cậy",
    },
    correction_queued: { title: "Đã xếp hàng thông báo đính chính" },
    correction_sent: { title: "Đã gửi thông báo đính chính" },
    correction_failed: {
      title: "Thông báo đính chính chưa gửi đủ",
      detail: "Hệ thống đang theo dõi trạng thái gửi",
    },
    drill_triggered: { title: "Đã bắt đầu diễn tập cảnh báo" },
    drill_acknowledged: { title: "Máy chủ đã nhận yêu cầu diễn tập" },
    drill_resolved: { title: "Diễn tập cảnh báo đã kết thúc" },
  };
  return { ...copy[item.event], drill: drillEvents.has(item.event) };
};

export const formatHistoryTime = (timestamp: string, timezone: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(timestamp));

const dayKey = (timestamp: string, timezone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(timestamp));

export const formatHistoryDay = (
  timestamp: string,
  serverTime: string,
  timezone: string,
) => {
  const itemKey = dayKey(timestamp, timezone);
  const todayKey = dayKey(serverTime, timezone);
  const yesterdayKey = dayKey(
    new Date(Date.parse(serverTime) - 24 * 60 * 60_000).toISOString(),
    timezone,
  );
  if (itemKey === todayKey) return "Hôm nay";
  if (itemKey === yesterdayKey) return "Hôm qua";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(timestamp));
};

export type HistoryRow =
  | { kind: "header"; id: string; label: string }
  | { kind: "item"; id: string; item: HistoryItem };

export const buildHistoryRows = (
  items: HistoryItem[],
  serverTime: string,
  timezone: string,
): HistoryRow[] => {
  const rows: HistoryRow[] = [];
  let previousLabel: string | null = null;
  for (const item of items) {
    const label = formatHistoryDay(item.occurredAt, serverTime, timezone);
    if (label !== previousLabel) {
      rows.push({ kind: "header", id: `day:${label}`, label });
      previousLabel = label;
    }
    rows.push({ kind: "item", id: item.id, item });
  }
  return rows;
};
