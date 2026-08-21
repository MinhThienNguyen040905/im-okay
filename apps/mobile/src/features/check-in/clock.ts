import { remainingUntilServerTime } from "@/lib/time/serverClock";
import {
  getLocaleTag,
  translate,
  type AppLocale,
} from "@/features/i18n/I18nProvider";

export { calculateServerClockOffset } from "@/lib/time/serverClock";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const remainingUntilDeadline = (
  deadline: string | null,
  clockOffsetMs: number,
  clientNowMs = Date.now(),
) => {
  return remainingUntilServerTime(deadline, clockOffsetMs, clientNowMs);
};

export const formatRemainingTime = (
  remainingMs: number | null,
  locale: AppLocale = "vi",
) => {
  if (remainingMs === null)
    return translate("checkIn.remainingNone", "Chưa có thời hạn", {}, locale);
  if (remainingMs <= 0)
    return translate("checkIn.remainingDue", "Đã đến hạn", {}, locale);

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0)
    return translate(
      "checkIn.remainingMinutes",
      "{minutes} phút",
      { minutes },
      locale,
    );
  return translate(
    "checkIn.remainingHoursMinutes",
    "{hours} giờ {minutes} phút",
    { hours, minutes },
    locale,
  );
};

export const isDeadlineApproaching = (remainingMs: number | null) =>
  remainingMs !== null && remainingMs > 0 && remainingMs <= 4 * HOUR_MS;

export const formatStatusTimestamp = (
  timestamp: string | null,
  timezone: string,
  locale: AppLocale = "vi",
) => {
  if (!timestamp)
    return translate("checkIn.timestampEmpty", "Chưa có", {}, locale);
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
};
