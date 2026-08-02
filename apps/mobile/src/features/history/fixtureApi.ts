import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthSession } from "@/features/auth/types";

import {
  HistoryApiError,
  historyItemSchema,
  historyPageSchema,
  type HistoryApi,
  type HistoryItem,
} from "./types";

const fixtureKey = (userId: string) => `imokay.fixture.server.${userId}.v1`;
const CURSOR_PREFIX = "fixture-history:";

type FixtureRecord = Record<string, unknown> & {
  historyEvents?: HistoryItem[];
};

const sampleEvents = (nowMs: number): HistoryItem[] =>
  [
    {
      id: "fixture-history-check-in",
      event: "check_in_recorded",
      occurredAt: new Date(nowMs - 45 * 60_000).toISOString(),
      nextDeadlineAt: new Date(nowMs + 36 * 60 * 60_000).toISOString(),
    },
    {
      id: "fixture-history-reminder",
      event: "reminder_sent",
      occurredAt: new Date(nowMs - 3 * 60 * 60_000).toISOString(),
      channels: ["push"],
    },
    {
      id: "fixture-history-snooze",
      event: "snooze_applied",
      occurredAt: new Date(nowMs - 26 * 60 * 60_000).toISOString(),
      durationHours: 4,
    },
    {
      id: "fixture-history-drill",
      event: "drill_resolved",
      occurredAt: new Date(nowMs - 3 * 24 * 60 * 60_000).toISOString(),
      source: "drill",
    },
  ].map((item) => historyItemSchema.parse(item));

const parseOffset = (cursor?: string | null) => {
  if (!cursor) return 0;
  if (!cursor.startsWith(CURSOR_PREFIX)) {
    throw new HistoryApiError("Con trỏ lịch sử không hợp lệ.", "server", false);
  }
  const offset = Number(cursor.slice(CURSOR_PREFIX.length));
  if (!Number.isInteger(offset) || offset < 0) {
    throw new HistoryApiError("Con trỏ lịch sử không hợp lệ.", "server", false);
  }
  return offset;
};

export const createFixtureHistoryApi = (session: AuthSession): HistoryApi => ({
  async getHistory(cursor, requestedLimit = 20) {
    const nowMs = Date.now();
    const record = JSON.parse(
      (await AsyncStorage.getItem(fixtureKey(session.user.id))) ?? "{}",
    ) as FixtureRecord;
    const historyEvents = record.historyEvents ?? sampleEvents(nowMs);
    if (!record.historyEvents) {
      await AsyncStorage.setItem(
        fixtureKey(session.user.id),
        JSON.stringify({ ...record, historyEvents }),
      );
    }
    const items = historyEvents
      .map((item) => historyItemSchema.parse(item))
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
    const offset = parseOffset(cursor);
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const pageItems = items.slice(offset, offset + limit);
    const nextOffset = offset + pageItems.length;

    return historyPageSchema.parse({
      serverTime: new Date(nowMs).toISOString(),
      summary: {
        rangeDays: 7,
        onTimeCheckInCount: items.filter(
          ({ event, occurredAt }) =>
            event === "check_in_recorded" &&
            Date.parse(occurredAt) >= nowMs - 7 * 24 * 60 * 60_000,
        ).length,
      },
      items: pageItems,
      nextCursor: nextOffset < items.length ? `${CURSOR_PREFIX}${nextOffset}` : null,
    });
  },
});
