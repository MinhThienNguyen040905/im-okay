import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  AppState,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

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
import { captureCurrentLocation } from "@/features/location/capture";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import {
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import type { PushDecision } from "@/features/onboarding/types";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const getErrorMessage = (_error: unknown, locale: AppLocale) => {
  return translate(
    "home.loadFailed",
    "Chưa thể tải trạng thái an toàn từ máy chủ.",
    {},
    locale,
  );
};

const getGreeting = (
  serverTime: string,
  timezone: string,
  locale: AppLocale,
) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(serverTime)),
  );
  if (hour < 11)
    return translate("home.greetingMorning", "Chào buổi sáng", {}, locale);
  if (hour < 18)
    return translate("home.greetingAfternoon", "Chào buổi chiều", {}, locale);
  return translate("home.greetingEvening", "Chào buổi tối", {}, locale);
};

const planBadge = (locale: AppLocale) => ({
  active: {
    label: translate("home.protected", "Đang được bảo vệ", {}, locale),
    variant: "success" as const,
  },
  snoozed: {
    label: translate("home.snoozed", "Đang tạm hoãn", {}, locale),
    variant: "warning" as const,
  },
  inactive: {
    label: translate("home.inactive", "Kế hoạch chưa hoạt động", {}, locale),
    variant: "danger" as const,
  },
});

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
  const { locale, t } = useI18n();
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
  const [shareLocation, setShareLocation] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const submitCheckIn = useCallback(async () => {
    checkInMutation.reset();
    setLocationNotice(null);
    if (!shareLocation) {
      checkInMutation.mutate(null);
      return;
    }
    setCapturingLocation(true);
    const capture = await captureCurrentLocation();
    setCapturingLocation(false);
    if (capture.status !== "captured") {
      setLocationNotice(
        t(
          "location.checkInUnavailable",
          "Không thể lấy vị trí. Check-in vẫn sẽ được gửi mà không kèm vị trí.",
        ),
      );
      checkInMutation.mutate(null);
      return;
    }
    checkInMutation.mutate(capture.location);
  }, [checkInMutation, shareLocation, t]);

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
          message={`${getErrorMessage(statusQuery.error, locale)} ${t("home.serverDoesNotGuessDeadline", "Deadline không được app tự suy đoán.")}`}
          onRetry={refreshStatus}
          title={t(
            "home.serverStatusUnavailable",
            "Chưa có trạng thái từ máy chủ",
          )}
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
  const badge = planBadge(locale)[status.plan.state];
  const nextDeadline = formatStatusTimestamp(
    status.plan.nextDeadlineAt,
    timezone,
    locale,
  );
  const lastCheckIn = formatStatusTimestamp(
    status.plan.lastCheckInAt,
    timezone,
    locale,
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.greeting}>
            {getGreeting(status.serverTime, timezone, locale)},{" "}
            {draft.displayName}
          </Text>
          {statusQuery.isFetching ? (
            <Text accessibilityLiveRegion="polite" style={styles.syncing}>
              {t("home.statusSyncing", "Đang đồng bộ trạng thái…")}
            </Text>
          ) : null}
        </View>
        <View
          accessibilityLabel={t("home.avatarA11y", "Ảnh đại diện")}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {draft.displayName?.trim().charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
      </View>

      <View style={styles.centered}>
        <Badge label={badge.label} variant={badge.variant} />
        {env.dataMode === "fixture" ? (
          <Badge
            label={t(
              "home.fixtureNoProtection",
              "Dữ liệu mẫu · không có bảo vệ thật",
            )}
            variant="warning"
          />
        ) : null}
      </View>

      <View style={styles.countdownArea}>
        <Text style={styles.countdownLabel}>
          {t("home.timeRemaining", "Thời gian còn lại")}
        </Text>
        <Text
          accessibilityLabel={t(
            "home.timeRemainingA11y",
            "Thời gian còn lại {time}",
            {
              time: formatRemainingTime(remainingMs, locale),
            },
          )}
          style={[styles.countdown, approaching && styles.countdownApproaching]}
        >
          {formatRemainingTime(remainingMs, locale)}
        </Text>
        <Text style={styles.deadline}>
          {t("home.nextDeadlineValue", "Hạn tiếp theo: {time}", {
            time: nextDeadline,
          })}
        </Text>
      </View>

      <View style={styles.checkInArea}>
        <View style={styles.locationOption}>
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>
              {t("location.checkInTitle", "Chia sẻ vị trí cùng check-in")}
            </Text>
            <Text style={styles.locationBody}>
              {t(
                "location.checkInBody",
                "Chỉ vị trí này có thể được chia sẻ với liên hệ tin cậy nếu cảnh báo kế tiếp xảy ra.",
              )}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t(
              "location.checkInA11y",
              "Bật chia sẻ vị trí tự nguyện cùng lần check-in này",
            )}
            disabled={checkInMutation.isPending || capturingLocation}
            onValueChange={setShareLocation}
            value={shareLocation}
          />
        </View>
        <CheckInButton
          disabled={status.plan.state === "inactive"}
          loading={checkInMutation.isPending || capturingLocation}
          onPress={() => void submitCheckIn()}
        />
        <Text style={styles.lastCheckIn}>
          {t("home.lastCheckInValue", "Lần xác nhận gần nhất: {time}", {
            time: lastCheckIn,
          })}
        </Text>
        {checkInMutation.isPending ? (
          <Text accessibilityLiveRegion="polite" style={styles.pendingText}>
            {t(
              "home.pendingConfirmation",
              "Đang chờ máy chủ xác nhận. Không đóng app nếu có thể.",
            )}
          </Text>
        ) : null}
        {locationNotice ? (
          <Text accessibilityLiveRegion="polite" style={styles.locationNotice}>
            {locationNotice}
          </Text>
        ) : null}
      </View>

      {approaching || currentAlertNeedsAttention ? (
        <Pressable
          accessibilityHint={t(
            "home.openWarningHint",
            "Mở chi tiết và các hành động xử lý cảnh báo",
          )}
          accessibilityLabel={
            currentAlertNeedsAttention
              ? t(
                  "home.attentionBannerA11y",
                  "Trạng thái cần bạn chú ý, xem cảnh báo",
                )
              : t(
                  "home.approachingBannerA11y",
                  "Thời hạn đang đến gần, xem cảnh báo",
                )
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
                ? t("home.attention", "Trạng thái cần bạn chú ý")
                : t("home.approaching", "Thời hạn đang đến gần")}
            </Text>
            <Text style={styles.warningBody}>
              {t("home.reviewAction", "Chạm để xem và xử lý")}
            </Text>
          </View>
          <AppIcon color={colors.warning} name="chevron-right" />
        </Pressable>
      ) : null}

      {checkInMutation.error ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorTitle}>
            {t("home.checkInNotRecorded", "Lần xác nhận chưa được ghi nhận")}
          </Text>
          <Text style={styles.errorBody}>
            {getErrorMessage(checkInMutation.error, locale)}{" "}
            {t("home.previousDeadlineUnchanged", "Deadline cũ vẫn giữ nguyên.")}
          </Text>
          <Button
            accessibilityLabel={t(
              "home.retryCheckInA11y",
              "Thử gửi lại cùng mã xác nhận",
            )}
            label={t("common.retry", "Thử lại")}
            onPress={() => void submitCheckIn()}
            variant="secondary"
          />
        </Card>
      ) : null}

      {statusQuery.isError ? (
        <Card muted>
          <Text accessibilityLiveRegion="polite" style={styles.warningTitle}>
            {t(
              "home.statusStale",
              "Chưa thể làm mới trạng thái. Dữ liệu đang hiển thị là lần đồng bộ gần nhất.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "home.refreshStatusA11y",
              "Đồng bộ lại trạng thái",
            )}
            label={t("home.refreshStatus", "Đồng bộ lại")}
            onPress={refreshStatus}
            variant="secondary"
          />
        </Card>
      ) : null}

      <View style={styles.statusGrid}>
        <StatusAction
          icon="group"
          label={t("home.contacts", "Liên hệ")}
          onPress={() => router.push("/contacts")}
          value={t("home.confirmedContacts", "{count} đã xác nhận", {
            count: status.contactSummary.confirmedCount,
          })}
        />
        <StatusAction
          icon="notifications-active"
          label={t("home.notifications", "Thông báo")}
          onPress={() => void Linking.openSettings()}
          value={
            pushReady
              ? t("home.notificationsEnabled", "Đã bật")
              : t("home.notificationsNotReady", "Chưa sẵn sàng")
          }
        />
      </View>

      {!pushReady ? (
        <Card muted>
          <View style={styles.inlineRow}>
            <AppIcon color={colors.warning} name="notifications-off" />
            <Text style={styles.warningTitle}>
              {t("home.pushNotReady", "Push chưa sẵn sàng")}
            </Text>
          </View>
          <Text style={styles.warningBody}>
            {t(
              "home.pushNotReadyBody",
              "Kế hoạch trên máy chủ không đổi, nhưng bạn có thể bỏ lỡ lời nhắc.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "home.openSystemNotificationSettings",
              "Mở cài đặt thông báo hệ thống",
            )}
            label={t("home.openSettings", "Mở cài đặt")}
            onPress={() => void Linking.openSettings()}
            variant="secondary"
          />
        </Card>
      ) : null}

      <Button
        accessibilityLabel={t("home.openSos", "Mở trợ giúp khẩn cấp")}
        label={t("home.urgentHelp", "Cần trợ giúp ngay")}
        leadingIcon={<AppIcon color={colors.danger} name="warning-amber" />}
        onPress={() => router.push("/sos")}
        variant="secondary"
      />

      <CheckInSuccessSheet
        alertOutcome={success?.status.lastAlertOutcome}
        nextDeadline={formatStatusTimestamp(
          success?.status.plan.nextDeadlineAt ?? null,
          timezone,
          locale,
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
  locationOption: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    width: "100%",
  },
  locationCopy: { flex: 1, gap: spacing.xxs },
  locationTitle: { ...typography.label, color: colors.textPrimary },
  locationBody: { ...typography.caption, color: colors.textSecondary },
  locationNotice: {
    ...typography.caption,
    color: colors.warning,
    textAlign: "center",
  },
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
