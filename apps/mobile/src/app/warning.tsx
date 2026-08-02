import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  AppIcon,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { createAlertsApi } from "@/features/alerts/api";
import {
  clearAlertAttempt,
  getOrCreateAlertAttempt,
  shouldRetainAlertAttempt,
} from "@/features/alerts/attemptStore";
import {
  useAlertContextRefresh,
  useAlertCountdown,
} from "@/features/alerts/hooks";
import {
  channelsCopy,
  deliveryStatusCopy,
  formatAlertCountdown,
  formatAlertTimestamp,
} from "@/features/alerts/presentation";
import { alertContextQueryKey } from "@/features/alerts/query";
import { SnoozeSheet } from "@/features/alerts/SnoozeSheet";
import {
  AlertsApiError,
  type AlertContextSnapshot,
  type SnoozeDuration,
} from "@/features/alerts/types";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import { useAuthoritativeCheckIn } from "@/features/check-in/hooks";
import { safetyStatusQueryKey } from "@/features/check-in/query";
import {
  CheckInApiError,
  type SafetyStatusSnapshot,
} from "@/features/check-in/types";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, radii, spacing, typography } from "@/theme";

const alertErrorMessage = (error: unknown) =>
  error instanceof AlertsApiError
    ? error.message
    : "Chưa thể tải trạng thái cảnh báo từ máy chủ.";

const checkInErrorMessage = (error: unknown) =>
  error instanceof CheckInApiError
    ? error.message
    : "Lần xác nhận chưa được máy chủ ghi nhận.";

const WarningResult = ({
  result,
  timezone,
}: {
  result: SafetyStatusSnapshot;
  timezone: string;
}) => {
  const router = useRouter();
  const outcome = result.status.lastAlertOutcome;
  return (
    <Screen>
      <View style={styles.resultIconSuccess}>
        <AppIcon color={colors.success} name="verified" size={44} />
      </View>
      <Text accessibilityRole="header" style={styles.resultTitle}>
        Máy chủ đã ghi nhận bạn an toàn
      </Text>
      <Card muted>
        <Text accessibilityLiveRegion="polite" style={styles.resultBody}>
          {outcome?.result === "correction_queued"
            ? "Cảnh báo đã bắt đầu gửi. Máy chủ đang xếp hàng thông báo đính chính tới các liên hệ."
            : outcome?.result === "correction_sent"
              ? "Máy chủ đã gửi thông báo đính chính tới các liên hệ từng nhận cảnh báo."
              : outcome?.result === "cancelled_before_notification"
                ? "Cảnh báo đã được hủy trước khi thông báo ra ngoài."
                : "Không có cảnh báo cần đính chính."}
        </Text>
      </Card>
      <Text style={styles.centerCopy}>
        Hạn tiếp theo:{" "}
        {formatAlertTimestamp(result.status.plan.nextDeadlineAt, timezone)}
      </Text>
      <Button
        accessibilityLabel="Về Trang chủ sau khi xác nhận an toàn"
        label="Về Trang chủ"
        onPress={() => router.replace("/(main)")}
      />
    </Screen>
  );
};

const SnoozeResult = ({
  result,
  timezone,
}: {
  result: AlertContextSnapshot;
  timezone: string;
}) => {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.resultIconWarning}>
        <AppIcon color={colors.warning} name="schedule" size={44} />
      </View>
      <Text accessibilityRole="header" style={styles.resultTitle}>
        Đã tạm hoãn có thời hạn
      </Text>
      <Card muted>
        <Text accessibilityLiveRegion="polite" style={styles.resultBody}>
          Máy chủ xác nhận kế hoạch sẽ được tạm hoãn đến{" "}
          {formatAlertTimestamp(result.projection.plan.snoozedUntil, timezone)}.
        </Text>
      </Card>
      <Text style={styles.centerCopy}>
        Ứng dụng không tự tính hoặc kéo dài thời điểm này.
      </Text>
      <Button
        accessibilityLabel="Về Trang chủ sau khi tạm hoãn"
        label="Về Trang chủ"
        onPress={() => router.replace("/(main)")}
      />
    </Screen>
  );
};

const WarningContent = ({ session }: { session: AuthSession }) => {
  const api = useMemo(() => createAlertsApi(session), [session]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { draft } = useOnboarding();
  const timezone = draft.timezone ?? "UTC";
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [checkInResult, setCheckInResult] =
    useState<SafetyStatusSnapshot | null>(null);
  const [snoozeResult, setSnoozeResult] = useState<AlertContextSnapshot | null>(
    null,
  );
  const zeroRefreshedFor = useRef<string | null>(null);

  const queryKey = alertContextQueryKey(session.user.id);
  const contextQuery = useQuery({
    queryKey,
    queryFn: api.getContext,
    retry: (failureCount, error) =>
      failureCount < 1 &&
      (!(error instanceof AlertsApiError) || error.retryable),
  });
  const { refetch } = contextQuery;
  const refresh = useCallback(() => void refetch(), [refetch]);
  useAlertContextRefresh(refresh);

  const checkInMutation = useAuthoritativeCheckIn(session, (result) => {
    setCheckInResult(result);
    void queryClient.invalidateQueries({ queryKey });
  });

  const snoozeMutation = useMutation({
    mutationFn: async (duration: SnoozeDuration) => {
      const scope = `snooze-${duration}` as const;
      const key = await getOrCreateAlertAttempt(session.user.id, scope);
      return api.snooze(duration, key);
    },
    onSuccess: async (result, duration) => {
      await clearAlertAttempt(session.user.id, `snooze-${duration}`);
      queryClient.setQueryData(queryKey, result);
      void queryClient.invalidateQueries({
        queryKey: safetyStatusQueryKey(session.user.id),
      });
      setSnoozeOpen(false);
      setSnoozeResult(result);
    },
    onError: async (error, duration) => {
      if (!shouldRetainAlertAttempt(error)) {
        await clearAlertAttempt(session.user.id, `snooze-${duration}`);
      }
    },
  });

  const snapshot = contextQuery.data;
  const triggerAt =
    snapshot?.projection.currentAlert?.source === "deadline"
      ? snapshot.projection.currentAlert.triggerAt
      : (snapshot?.projection.plan.nextDeadlineAt ?? null);
  const remainingMs = useAlertCountdown(
    triggerAt,
    snapshot?.clockOffsetMs ?? 0,
  );

  useEffect(() => {
    if (
      remainingMs === 0 &&
      triggerAt &&
      zeroRefreshedFor.current !== triggerAt
    ) {
      zeroRefreshedFor.current = triggerAt;
      refresh();
    }
  }, [refresh, remainingMs, triggerAt]);

  if (checkInResult) {
    return <WarningResult result={checkInResult} timezone={timezone} />;
  }
  if (snoozeResult) {
    return <SnoozeResult result={snoozeResult} timezone={timezone} />;
  }
  if (contextQuery.isPending) {
    return (
      <Screen scrollable={false}>
        <LoadingState label="Đang đồng bộ trạng thái cảnh báo…" />
      </Screen>
    );
  }
  if (!snapshot) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          message={alertErrorMessage(contextQuery.error)}
          onRetry={refresh}
          title="Chưa có trạng thái từ máy chủ"
        />
      </Screen>
    );
  }

  const { projection } = snapshot;
  const alert = projection.currentAlert;
  const isDeadlineAlert = !alert || alert.source === "deadline";
  const notificationStarted = alert && alert.delivery.status !== "not_started";
  const terminalAlert =
    alert && ["resolved", "cancelled"].includes(alert.state);
  const countdownEnded = remainingMs === 0;
  const snoozeDurations = countdownEnded
    ? []
    : projection.availableActions.snoozeDurationsHours;
  const firstContact =
    projection.contactSummary.firstContactName ?? "chưa có liên hệ đã xác nhận";
  const badge = terminalAlert
    ? {
        label:
          alert.state === "resolved"
            ? "Cảnh báo đã kết thúc"
            : "Cảnh báo đã hủy",
        variant: "success" as const,
      }
    : alert?.source === "drill"
      ? { label: "DIỄN TẬP", variant: "neutral" as const }
      : alert?.source === "sos"
        ? { label: "SOS đã kích hoạt", variant: "danger" as const }
        : alert?.state === "triggering"
          ? { label: "Đang bắt đầu cảnh báo", variant: "warning" as const }
          : alert && ["triggered", "acknowledged"].includes(alert.state)
            ? { label: "Cảnh báo đã kích hoạt", variant: "danger" as const }
            : countdownEnded
              ? {
                  label: "Đang đồng bộ trạng thái",
                  variant: "warning" as const,
                }
              : { label: "Sắp gửi cảnh báo", variant: "warning" as const };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.wordmark}>
        I&apos;m Okay
      </Text>
      <View style={styles.centered}>
        <Badge label={badge.label} variant={badge.variant} />
        {env.dataMode === "fixture" ? (
          <Badge
            label="Dữ liệu mẫu · không gửi cảnh báo thật"
            variant="warning"
          />
        ) : null}
      </View>

      <Text accessibilityRole="header" style={styles.heading}>
        {terminalAlert
          ? "Trạng thái cảnh báo đã kết thúc"
          : alert?.source === "sos"
            ? "Yêu cầu trợ giúp đang được xử lý"
            : alert?.source === "drill"
              ? "Đây là một lượt diễn tập"
              : "Bạn chưa xác nhận an toàn"}
      </Text>

      {isDeadlineAlert ? (
        <View style={styles.countdownArea}>
          <Text
            accessibilityLabel={`Thời gian còn lại ${formatAlertCountdown(remainingMs)}`}
            style={styles.countdown}
          >
            {formatAlertCountdown(remainingMs)}
          </Text>
          <Text style={styles.centerCopy}>
            trước khi thông báo cho {firstContact}
          </Text>
        </View>
      ) : null}

      <Card muted>
        <View style={styles.infoRow}>
          <AppIcon color={colors.textSecondary} name="schedule" />
          <Text style={styles.infoText}>
            Hạn điểm danh: {formatAlertTimestamp(triggerAt, timezone)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <AppIcon color={colors.textSecondary} name="person-outline" />
          <Text style={styles.infoText}>Liên hệ đầu tiên: {firstContact}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <AppIcon color={colors.textSecondary} name="mail-outline" />
          <Text style={styles.infoText}>
            Kênh hiện tại:{" "}
            {channelsCopy(
              alert?.delivery.channels ?? projection.channelSummary.deadline,
            )}
          </Text>
        </View>
      </Card>

      {notificationStarted ? (
        <Card style={styles.deliveryCard}>
          <Text accessibilityLiveRegion="polite" style={styles.deliveryText}>
            {alert.correction.status === "queued"
              ? "Bạn đã xác nhận an toàn. Máy chủ đang xếp hàng gửi đính chính tới các liên hệ."
              : alert.correction.status === "sent"
                ? "Máy chủ đã gửi đính chính tới các liên hệ từng nhận cảnh báo."
                : alert.correction.status === "failed"
                  ? "Đính chính chưa gửi được. Hệ thống cần thử lại hoặc được kiểm tra."
                  : deliveryStatusCopy[alert.delivery.status]}
          </Text>
        </Card>
      ) : null}

      <Button
        accessibilityLabel="Xác nhận tôi vẫn ổn từ màn hình cảnh báo"
        disabled={!projection.availableActions.canCheckIn}
        label="Tôi vẫn ổn"
        loading={checkInMutation.isPending}
        onPress={() => checkInMutation.mutate()}
      />

      {checkInMutation.error ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {checkInErrorMessage(checkInMutation.error)} Cảnh báo cũ chưa được
            app tự hủy.
          </Text>
        </Card>
      ) : null}

      {isDeadlineAlert && !notificationStarted ? (
        <Button
          accessibilityLabel={
            snoozeDurations.length
              ? "Mở lựa chọn tạm hoãn có thời hạn"
              : "Không thể tạm hoãn ở trạng thái hiện tại"
          }
          disabled={snoozeDurations.length === 0}
          label="Tạm hoãn"
          onPress={() => {
            snoozeMutation.reset();
            setSnoozeOpen(true);
          }}
          variant="secondary"
        />
      ) : null}

      <Button
        accessibilityLabel="Xem tất cả liên hệ sẽ được báo"
        label="Xem tất cả liên hệ sẽ được báo"
        onPress={() => router.push("/contacts")}
        variant="secondary"
      />

      <Text style={styles.explanation}>
        Nếu bạn không phản hồi, I&apos;m Okay sẽ bắt đầu quy trình cảnh báo tự
        động. Ứng dụng không tự gọi dịch vụ cứu hộ.
      </Text>

      {contextQuery.isError ? (
        <Card muted>
          <Text accessibilityLiveRegion="polite" style={styles.staleText}>
            Chưa thể làm mới. Trạng thái đang hiển thị là lần đồng bộ gần nhất.
          </Text>
        </Card>
      ) : null}

      <SnoozeSheet
        durations={snoozeDurations}
        error={
          snoozeMutation.error
            ? `${alertErrorMessage(snoozeMutation.error)} Tạm hoãn chưa được xác nhận.`
            : undefined
        }
        loading={snoozeMutation.isPending}
        onClose={() => !snoozeMutation.isPending && setSnoozeOpen(false)}
        onSubmit={(duration) => snoozeMutation.mutate(duration)}
        visible={snoozeOpen}
      />
    </Screen>
  );
};

export default function WarningScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <WarningContent session={session} />;
}

const styles = StyleSheet.create({
  wordmark: {
    ...typography.headingMedium,
    color: colors.primary,
    textAlign: "center",
  },
  centered: { alignItems: "center", gap: spacing.xs },
  heading: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  countdownArea: { alignItems: "center", gap: spacing.xs },
  countdown: {
    ...typography.display,
    ...typography.numeric,
    color: colors.warning,
    textAlign: "center",
  },
  centerCopy: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  infoRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  infoText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  divider: { backgroundColor: colors.border, height: 1 },
  deliveryCard: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warning,
  },
  deliveryText: { ...typography.bodyMedium, color: colors.warning },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: { ...typography.bodyMedium, color: colors.danger },
  staleText: { ...typography.bodyMedium, color: colors.textSecondary },
  explanation: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  resultIconSuccess: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.successContainer,
    borderRadius: radii.pill,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  resultIconWarning: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.warningContainer,
    borderRadius: radii.pill,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  resultTitle: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  resultBody: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
