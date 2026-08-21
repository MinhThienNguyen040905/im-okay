import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon, Badge, Card, ErrorState, Screen } from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import { createHistoryApi } from "@/features/history/api";
import {
  buildHistoryRows,
  filterHistory,
  formatHistoryTime,
  historyCopy,
  type HistoryRow,
} from "@/features/history/presentation";
import { historyQueryKey } from "@/features/history/query";
import type { HistoryFilter } from "@/features/history/types";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { useI18n, type AppLocale } from "@/features/i18n/I18nProvider";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const filters = (locale: AppLocale) => [
  { id: "all" as const, label: locale === "en" ? "All" : "Tất cả" },
  {
    id: "check_in" as const,
    label: locale === "en" ? "Check-ins" : "Điểm danh",
  },
  { id: "alert" as const, label: locale === "en" ? "Alerts" : "Cảnh báo" },
];

const eventIcon = {
  check_in_recorded: "check-circle",
  reminder_sent: "notifications-none",
  snooze_applied: "schedule",
  alert_triggered: "warning-amber",
  alert_acknowledged: "campaign",
  alert_resolved: "task-alt",
  contact_response_received: "mark-email-read",
  correction_queued: "outgoing-mail",
  correction_sent: "forward-to-inbox",
  correction_failed: "error-outline",
  drill_triggered: "security",
  drill_acknowledged: "security",
  drill_resolved: "verified-user",
} as const;

const HistoryItemRow = ({
  row,
  timezone,
  locale,
}: {
  row: HistoryRow;
  timezone: string;
  locale: AppLocale;
}) => {
  if (row.kind === "header") {
    return <Text style={styles.dayHeader}>{row.label}</Text>;
  }
  const copy = historyCopy(row.item, locale);
  const iconColor =
    row.item.event === "correction_failed"
      ? colors.danger
      : row.item.event === "reminder_sent" ||
          row.item.event === "alert_triggered"
        ? colors.warning
        : colors.primary;
  const iconBackground =
    row.item.event === "correction_failed"
      ? colors.dangerContainer
      : row.item.event === "reminder_sent" ||
          row.item.event === "alert_triggered"
        ? colors.warningContainer
        : row.item.event.startsWith("drill_")
          ? colors.primaryContainer
          : colors.surfaceMuted;
  const exactDeadline = row.item.nextDeadlineAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(row.item.nextDeadlineAt))
    : null;

  return (
    <Card
      accessibilityLabel={`${formatHistoryTime(row.item.occurredAt, timezone, locale)}, ${copy.title}`}
      style={styles.timelineCard}
    >
      <View style={styles.timelineRow}>
        <Text style={styles.time}>
          {formatHistoryTime(row.item.occurredAt, timezone, locale)}
        </Text>
        <View style={[styles.eventIcon, { backgroundColor: iconBackground }]}>
          <AppIcon
            color={iconColor}
            name={eventIcon[row.item.event]}
            size={20}
          />
        </View>
        <View style={styles.eventCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{copy.title}</Text>
            {copy.drill ? (
              <Badge
                label={locale === "en" ? "DRILL" : "DIỄN TẬP"}
                variant="success"
              />
            ) : null}
          </View>
          {exactDeadline ? (
            <Text style={styles.eventDetail}>
              {locale === "en"
                ? `New deadline: ${exactDeadline}`
                : `Thời hạn mới: ${exactDeadline}`}
            </Text>
          ) : copy.detail ? (
            <Text style={styles.eventDetail}>{copy.detail}</Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const HistoryContent = ({ session }: { session: AuthSession }) => {
  const { draft } = useOnboarding();
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const api = useMemo(() => createHistoryApi(session), [session]);
  const query = useInfiniteQuery({
    queryKey: historyQueryKey(session.user.id),
    queryFn: ({ pageParam }) => api.getHistory(pageParam, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 1,
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data?.pages]);
  const firstPage = pages[0];
  const allItems = useMemo(() => {
    const byId = new Map(
      pages.flatMap(({ items }) => items).map((item) => [item.id, item]),
    );
    return [...byId.values()].sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
  }, [pages]);
  const timezone = draft.timezone ?? "UTC";
  const rows = firstPage
    ? buildHistoryRows(
        filterHistory(allItems, filter),
        firstPage.serverTime,
        timezone,
        locale,
      )
    : [];

  if (query.isPending) {
    return (
      <Screen scrollable={false}>
        <View style={styles.screenHeader}>
          <Text accessibilityRole="header" style={styles.title}>
            {t("history.title", "Lịch sử")}
          </Text>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.eventDetail}>
            {t("history.loading", "Đang tải lịch sử an toàn…")}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!firstPage) {
    return (
      <Screen scrollable={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("history.title", "Lịch sử")}
        </Text>
        <ErrorState
          message={t(
            "history.loadFailed",
            "Không thể tải projection lịch sử an toàn từ máy chủ.",
          )}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.staticContent} scrollable={false}>
      <View style={styles.screenHeader}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("history.title", "Lịch sử")}
        </Text>
        {query.isFetching && !query.isFetchingNextPage ? (
          <Text accessibilityLiveRegion="polite" style={styles.syncing}>
            {t("history.syncing", "Đang đồng bộ…")}
          </Text>
        ) : null}
      </View>

      <View accessibilityRole="tablist" style={styles.segmented}>
        {filters(locale).map((option) => {
          const selected = filter === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(option.id)}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        <AppIcon color={colors.primary} name="info-outline" size={18} />
        <Text style={styles.summary}>
          {t(
            "history.summary",
            "7 ngày gần đây · {count} lần xác nhận đúng hạn",
            { count: firstPage.summary.onTimeCheckInCount },
          )}
        </Text>
      </View>
      {env.dataMode === "fixture" ? (
        <Badge
          label={t(
            "history.fixtureNoProtection",
            "Dữ liệu mẫu · không có bảo vệ thật",
          )}
          variant="warning"
        />
      ) : null}

      <FlatList
        contentContainerStyle={
          rows.length === 0 ? styles.emptyList : styles.list
        }
        data={rows}
        keyExtractor={(row) => row.id}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        renderItem={({ item }) => (
          <HistoryItemRow locale={locale} row={item} timezone={timezone} />
        )}
        ListEmptyComponent={
          <View style={styles.centerState}>
            <AppIcon color={colors.textSecondary} name="history" size={36} />
            <Text style={styles.emptyTitle}>
              {t("history.emptyTitle", "Chưa có hoạt động phù hợp")}
            </Text>
            <Text style={styles.eventDetail}>
              {t(
                "history.emptyBody",
                "Kéo xuống để đồng bộ hoặc chọn bộ lọc khác.",
              )}
            </Text>
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.primary}
              style={styles.pageLoader}
            />
          ) : query.isFetchNextPageError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void query.fetchNextPage()}
              style={styles.retryPage}
            >
              <Text style={styles.retryText}>
                {t("history.retryPage", "Chưa tải được trang tiếp · Thử lại")}
              </Text>
            </Pressable>
          ) : null
        }
      />
    </Screen>
  );
};

export default function HistoryScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <HistoryContent session={session} />;
}

const styles = StyleSheet.create({
  staticContent: {
    gap: spacing.md,
    paddingBottom: 0,
    paddingTop: spacing.lg,
  },
  screenHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { ...typography.headingLarge, color: colors.primary },
  syncing: { ...typography.caption, color: colors.textSecondary },
  segmented: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    padding: spacing.xxs,
  },
  segment: {
    alignItems: "center",
    borderRadius: radii.sm,
    flex: 1,
    justifyContent: "center",
    minHeight: sizes.minimumTouchTarget,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { ...typography.bodyMedium, color: colors.textSecondary },
  segmentTextActive: { ...typography.label, color: colors.textPrimary },
  summaryRow: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    padding: spacing.sm,
  },
  summary: { ...typography.bodyMedium, color: colors.textSecondary, flex: 1 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  dayHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  timelineCard: { minHeight: 68, padding: spacing.sm },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  time: {
    ...typography.caption,
    ...typography.numeric,
    color: colors.textSecondary,
    minWidth: 44,
  },
  eventIcon: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  eventCopy: { flex: 1, gap: spacing.xxs },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  eventTitle: { ...typography.label, color: colors.textPrimary, flexShrink: 1 },
  eventDetail: { ...typography.bodyMedium, color: colors.textSecondary },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  emptyTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  pageLoader: { margin: spacing.lg },
  retryPage: {
    alignItems: "center",
    minHeight: sizes.minimumTouchTarget,
    justifyContent: "center",
  },
  retryText: { ...typography.label, color: colors.primary },
});
