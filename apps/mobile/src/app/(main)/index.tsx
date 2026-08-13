import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon, Badge, Button, Card, ErrorState, Screen } from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import { createCheckInApi } from "@/features/check-in/api";
import {
  formatRemainingTime,
  formatStatusTimestamp,
  isDeadlineApproaching,
} from "@/features/check-in/clock";
import { CheckInButton } from "@/features/check-in/CheckInButton";
import { CheckInSuccessSheet } from "@/features/check-in/CheckInSuccessSheet";
import { HomeSkeleton } from "@/features/check-in/HomeSkeleton";
import {
  useAuthoritativeCheckIn,
  useSafetyStatusRefresh,
  useServerCountdown,
} from "@/features/check-in/hooks";
import { isAlertAttentionState } from "@/features/check-in/presentation";
import { safetyStatusQueryKey } from "@/features/check-in/query";
import {
  CheckInApiError,
  type SafetyStatusSnapshot,
} from "@/features/check-in/types";
import { getPushPermission } from "@/features/notifications/push";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import type { PushDecision } from "@/features/onboarding/types";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const getErrorMessage = (error: unknown) => {
  if (error instanceof CheckInApiError) return error.message;
  return "Chưa thể tải trạng thái an toàn từ máy chủ.";
};

const getGreeting = (serverTime: string, timezone: string) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(serverTime)),
  );
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

const planBadge = {
  active: { label: "Đang được bảo vệ", variant: "success" as const },
  snoozed: { label: "Đang tạm hoãn", variant: "warning" as const },
  inactive: { label: "Kế hoạch chưa hoạt động", variant: "danger" as const },
};

type StatusActionProps = {
  icon: "group" | "notifications-active";
  label: string;
  onPress: () => void;
  value: string;
};

const StatusAction = ({ icon, label, onPress, value }: StatusActionProps) => (
  <Pressable
    accessibilityLabel={`${label}: ${value}`}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.statusAction, pressed && styles.pressed]}
  >
    <View style={styles.statusIcon}>
      <AppIcon color={colors.primary} name={icon} />
    </View>
    <View style={styles.statusCopy}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  </Pressable>
);

const HomeContent = ({ session }: { session: AuthSession }) => {
  const router = useRouter();
  const { draft } = useOnboarding();
  const api = useMemo(() => createCheckInApi(session), [session]);
  const [success, setSuccess] = useState<SafetyStatusSnapshot | null>(null);
  const [pushPermission, setPushPermission] = useState<PushDecision>(
    draft.pushDecision,
  );

  const statusQuery = useQuery({
    queryKey: safetyStatusQueryKey(session.user.id),
    queryFn: api.getStatus,
    retry: (failureCount, error) =>
      failureCount < 1 &&
      (!(error instanceof CheckInApiError) || error.retryable),
  });
  const { refetch: refetchStatus } = statusQuery;

  const refreshStatus = useCallback(() => {
    void refetchStatus();
  }, [refetchStatus]);
  useSafetyStatusRefresh(refreshStatus);

  const refreshPushPermission = useCallback(() => {
    void getPushPermission()
      .then(setPushPermission)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshPushPermission();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPushPermission();
    });
    return () => subscription.remove();
  }, [refreshPushPermission]);

  const checkInMutation = useAuthoritativeCheckIn(session, setSuccess);

  const snapshot = statusQuery.data;
  const remainingMs = useServerCountdown(
    snapshot?.status.plan.nextDeadlineAt ?? null,
    snapshot?.clockOffsetMs ?? 0,
  );

  if (statusQuery.isPending) {
    return (
      <Screen>
        <HomeSkeleton />
      </Screen>
    );
  }

  if (!snapshot) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          message={`${getErrorMessage(statusQuery.error)} Deadline không được app tự suy đoán.`}
          onRetry={refreshStatus}
          title="Chưa có trạng thái từ máy chủ"
        />
      </Screen>
    );
  }

  const { status } = snapshot;
  const timezone = draft.timezone ?? "UTC";
  const approaching = isDeadlineApproaching(remainingMs);
  const currentAlertNeedsAttention = isAlertAttentionState(
    status.currentAlert?.state,
  );
  const pushReady =
    pushPermission === "granted" && draft.deviceRegistration === "registered";
  const badge = planBadge[status.plan.state];
  const nextDeadline = formatStatusTimestamp(
    status.plan.nextDeadlineAt,
    timezone,
  );
  const lastCheckIn = formatStatusTimestamp(
    status.plan.lastCheckInAt,
    timezone,
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.greeting}>
            {getGreeting(status.serverTime, timezone)}, {draft.displayName}
          </Text>
          {statusQuery.isFetching ? (
            <Text accessibilityLiveRegion="polite" style={styles.syncing}>
              Đang đồng bộ trạng thái…
            </Text>
          ) : null}
        </View>
        <View accessibilityLabel="Ảnh đại diện" style={styles.avatar}>
          <Text style={styles.avatarText}>
            {draft.displayName?.trim().charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
      </View>

      <View style={styles.centered}>
        <Badge label={badge.label} variant={badge.variant} />
        {env.dataMode === "fixture" ? (
          <Badge label="Dữ liệu mẫu · không có bảo vệ thật" variant="warning" />
        ) : null}
      </View>

      <View style={styles.countdownArea}>
        <Text style={styles.countdownLabel}>Thời gian còn lại</Text>
        <Text
          accessibilityLabel={`Thời gian còn lại ${formatRemainingTime(remainingMs)}`}
          style={[styles.countdown, approaching && styles.countdownApproaching]}
        >
          {formatRemainingTime(remainingMs)}
        </Text>
        <Text style={styles.deadline}>Hạn tiếp theo: {nextDeadline}</Text>
      </View>

      <View style={styles.checkInArea}>
        <CheckInButton
          disabled={status.plan.state === "inactive"}
          loading={checkInMutation.isPending}
          onPress={() => checkInMutation.mutate()}
        />
        <Text style={styles.lastCheckIn}>
          Lần xác nhận gần nhất: {lastCheckIn}
        </Text>
        {checkInMutation.isPending ? (
          <Text accessibilityLiveRegion="polite" style={styles.pendingText}>
            Đang chờ máy chủ xác nhận. Không đóng app nếu có thể.
          </Text>
        ) : null}
      </View>

      {approaching || currentAlertNeedsAttention ? (
        <Pressable
          accessibilityHint="Mở chi tiết và các hành động xử lý cảnh báo"
          accessibilityLabel={
            currentAlertNeedsAttention
              ? "Trạng thái cần bạn chú ý, xem cảnh báo"
              : "Thời hạn đang đến gần, xem cảnh báo"
          }
          accessibilityRole="button"
          onPress={() => router.push("/warning")}
          style={({ pressed }) => [
            styles.warningBanner,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.warningIcon}>
            <AppIcon color={colors.warning} name="warning-amber" />
          </View>
          <View style={styles.warningCopy}>
            <Text style={styles.warningTitle}>
              {currentAlertNeedsAttention
                ? "Trạng thái cần bạn chú ý"
                : "Thời hạn đang đến gần"}
            </Text>
            <Text style={styles.warningBody}>Chạm để xem và xử lý</Text>
          </View>
          <AppIcon color={colors.warning} name="chevron-right" />
        </Pressable>
      ) : null}

      {checkInMutation.error ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorTitle}>
            Lần xác nhận chưa được ghi nhận
          </Text>
          <Text style={styles.errorBody}>
            {getErrorMessage(checkInMutation.error)} Deadline cũ vẫn giữ nguyên.
          </Text>
          <Button
            accessibilityLabel="Thử gửi lại cùng mã xác nhận"
            label="Thử lại"
            onPress={() => checkInMutation.mutate()}
            variant="secondary"
          />
        </Card>
      ) : null}

      {statusQuery.isError ? (
        <Card muted>
          <Text accessibilityLiveRegion="polite" style={styles.warningTitle}>
            Chưa thể làm mới trạng thái. Dữ liệu đang hiển thị là lần đồng bộ
            gần nhất.
          </Text>
          <Button
            accessibilityLabel="Đồng bộ lại trạng thái"
            label="Đồng bộ lại"
            onPress={refreshStatus}
            variant="secondary"
          />
        </Card>
      ) : null}

      <View style={styles.statusGrid}>
        <StatusAction
          icon="group"
          label="Liên hệ"
          onPress={() => router.push("/contacts")}
          value={`${status.contactSummary.confirmedCount} đã xác nhận`}
        />
        <StatusAction
          icon="notifications-active"
          label="Thông báo"
          onPress={() => void Linking.openSettings()}
          value={pushReady ? "Đã bật" : "Chưa sẵn sàng"}
        />
      </View>

      {!pushReady ? (
        <Card muted>
          <View style={styles.inlineRow}>
            <AppIcon color={colors.warning} name="notifications-off" />
            <Text style={styles.warningTitle}>Push chưa sẵn sàng</Text>
          </View>
          <Text style={styles.warningBody}>
            Kế hoạch trên máy chủ không đổi, nhưng bạn có thể bỏ lỡ lời nhắc.
          </Text>
          <Button
            accessibilityLabel="Mở cài đặt thông báo hệ thống"
            label="Mở cài đặt"
            onPress={() => void Linking.openSettings()}
            variant="secondary"
          />
        </Card>
      ) : null}

      <Button
        accessibilityLabel="Mở trợ giúp khẩn cấp"
        label="Cần trợ giúp ngay"
        leadingIcon={<AppIcon color={colors.danger} name="warning-amber" />}
        onPress={() => router.push("/sos")}
        variant="secondary"
      />

      <CheckInSuccessSheet
        alertOutcome={success?.status.lastAlertOutcome}
        nextDeadline={formatStatusTimestamp(
          success?.status.plan.nextDeadlineAt ?? null,
          timezone,
        )}
        onClose={() => setSuccess(null)}
        visible={Boolean(success)}
      />
    </Screen>
  );
};

export default function HomeScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <HomeContent session={session} />;
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingBottom: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
  greeting: { ...typography.headingMedium, color: colors.primary },
  syncing: { ...typography.caption, color: colors.textSecondary },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { ...typography.headingMedium, color: colors.primary },
  centered: { alignItems: "center", gap: spacing.xs },
  countdownArea: { alignItems: "center", gap: spacing.xxs },
  countdownLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  countdown: {
    ...typography.display,
    ...typography.numeric,
    color: colors.textPrimary,
    textAlign: "center",
  },
  countdownApproaching: { color: colors.warning },
  deadline: { ...typography.caption, color: colors.textSecondary },
  checkInArea: { alignItems: "center", gap: spacing.sm },
  lastCheckIn: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  pendingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statusGrid: { flexDirection: "row", gap: spacing.md },
  statusAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: sizes.minimumTouchTarget + spacing.md,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.75 },
  statusIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  statusCopy: { flex: 1, gap: spacing.xxs },
  statusLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  statusValue: { ...typography.label, color: colors.textPrimary },
  inlineRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  warningBanner: {
    alignItems: "center",
    backgroundColor: colors.warningContainer,
    borderColor: colors.warning,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: sizes.minimumTouchTarget + spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  warningCopy: { flex: 1, gap: spacing.xxs },
  warningTitle: { ...typography.label, color: colors.warning },
  warningBody: { ...typography.bodyMedium, color: colors.textSecondary },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorTitle: { ...typography.label, color: colors.danger },
  errorBody: { ...typography.bodyMedium, color: colors.textPrimary },
});
