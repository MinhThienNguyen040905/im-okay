import { remainingUntilServerTime } from "@/lib/time/serverClock";

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

export const formatRemainingTime = (remainingMs: number | null) => {
  if (remainingMs === null) return "Chưa có thời hạn";
  if (remainingMs <= 0) return "Đã đến hạn";

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} phút`;
  return `${hours} giờ ${minutes} phút`;
};

export const isDeadlineApproaching = (remainingMs: number | null) =>
  remainingMs !== null && remainingMs > 0 && remainingMs <= 4 * HOUR_MS;

export const formatStatusTimestamp = (
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
