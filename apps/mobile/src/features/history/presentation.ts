import type { HistoryEvent, HistoryFilter, HistoryItem } from "./types";
import {
  getLocaleTag,
  translate,
  type AppLocale,
} from "@/features/i18n/I18nProvider";

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

export const historyCopy = (item: HistoryItem, locale: AppLocale = "vi") => {
  const channels = item.channels
    ?.map((channel) =>
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
  const copy: Record<HistoryEvent, { title: string; detail?: string }> = {
    check_in_recorded: {
      title: translate(
        "history.checkInRecorded",
        "Đã xác nhận an toàn",
        {},
        locale,
      ),
      detail: item.nextDeadlineAt
        ? translate(
            "history.nextDeadlineCreated",
            "Máy chủ đã tạo thời hạn tiếp theo",
            {},
            locale,
          )
        : undefined,
    },
    reminder_sent: {
      title: translate("history.reminderSent", "Đã gửi lời nhắc", {}, locale),
      detail: channels
        ? translate("history.channel", "Kênh: {channels}", { channels }, locale)
        : undefined,
    },
    snooze_applied: {
      title: translate(
        "history.snoozeApplied",
        "Đã tạm hoãn bảo vệ",
        {},
        locale,
      ),
      detail: item.durationHours
        ? translate(
            "history.snoozeDuration",
            "Trong {hours} giờ",
            { hours: item.durationHours },
            locale,
          )
        : undefined,
    },
    alert_triggered: {
      title: translate(
        "history.alertTriggered",
        "Cảnh báo đã được kích hoạt",
        {},
        locale,
      ),
    },
    alert_acknowledged: {
      title: translate(
        "history.alertAcknowledged",
        "Máy chủ đã nhận cảnh báo",
        {},
        locale,
      ),
    },
    alert_resolved: {
      title: translate(
        "history.alertResolved",
        "Cảnh báo đã kết thúc",
        {},
        locale,
      ),
    },
    contact_response_received: {
      title: translate(
        "history.contactResponse",
        "Đã nhận phản hồi từ liên hệ tin cậy",
        {},
        locale,
      ),
    },
    correction_queued: {
      title: translate(
        "history.correctionQueued",
        "Đã xếp hàng thông báo đính chính",
        {},
        locale,
      ),
    },
    correction_sent: {
      title: translate(
        "history.correctionSent",
        "Đã gửi thông báo đính chính",
        {},
        locale,
      ),
    },
    correction_failed: {
      title: translate(
        "history.correctionFailed",
        "Thông báo đính chính chưa gửi đủ",
        {},
        locale,
      ),
      detail: translate(
        "history.correctionFailedDetail",
        "Hệ thống đang theo dõi trạng thái gửi",
        {},
        locale,
      ),
    },
    drill_triggered: {
      title: translate(
        "history.drillTriggered",
        "Đã bắt đầu diễn tập cảnh báo",
        {},
        locale,
      ),
    },
    drill_acknowledged: {
      title: translate(
        "history.drillAcknowledged",
        "Máy chủ đã nhận yêu cầu diễn tập",
        {},
        locale,
      ),
    },
    drill_resolved: {
      title: translate(
        "history.drillResolved",
        "Diễn tập cảnh báo đã kết thúc",
        {},
        locale,
      ),
    },
  };
  return { ...copy[item.event], drill: drillEvents.has(item.event) };
};

export const formatHistoryTime = (
  timestamp: string,
  timezone: string,
  locale: AppLocale = "vi",
) =>
  new Intl.DateTimeFormat(getLocaleTag(locale), {
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
  locale: AppLocale = "vi",
) => {
  const itemKey = dayKey(timestamp, timezone);
  const todayKey = dayKey(serverTime, timezone);
  const yesterdayKey = dayKey(
    new Date(Date.parse(serverTime) - 24 * 60 * 60_000).toISOString(),
    timezone,
  );
  if (itemKey === todayKey)
    return translate("history.today", "Hôm nay", {}, locale);
  if (itemKey === yesterdayKey)
    return translate("history.yesterday", "Hôm qua", {}, locale);
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
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
  locale: AppLocale = "vi",
): HistoryRow[] => {
  const rows: HistoryRow[] = [];
  let previousLabel: string | null = null;
  for (const item of items) {
    const label = formatHistoryDay(
      item.occurredAt,
      serverTime,
      timezone,
      locale,
    );
    if (label !== previousLabel) {
      rows.push({ kind: "header", id: `day:${label}`, label });
      previousLabel = label;
    }
    rows.push({ kind: "item", id: item.id, item });
  }
  return rows;
};
