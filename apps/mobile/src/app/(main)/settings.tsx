import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Redirect, useRouter } from "expo-router";
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppIcon,
  type AppIconName,
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  LoadingState,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import { safetyStatusQueryKey } from "@/features/check-in/query";
import { historyQueryKey } from "@/features/history/query";
import { getPushPermission } from "@/features/notifications/push";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import type { PushDecision } from "@/features/onboarding/types";
import {
  clearSettingsAttempt,
  getOrCreateSettingsAttempt,
} from "@/features/settings/actionAttemptStore";
import { createSettingsApi } from "@/features/settings/api";
import { settingsQueryKey } from "@/features/settings/query";
import {
  isIanaTimezone,
  SettingsApiError,
  type SettingsInterval,
  type SettingsProjection,
} from "@/features/settings/types";
import { colors, radii, sizes, spacing, typography } from "@/theme";

type SettingsRowProps = {
  icon: AppIconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
};

const SettingsRow = ({
  icon,
  label,
  value,
  onPress,
  danger,
}: SettingsRowProps) => {
  const content = (
    <>
      <AppIcon
        color={danger ? colors.danger : colors.textSecondary}
        name={icon}
        size={20}
      />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>
          {label}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {onPress ? (
        <AppIcon color={colors.textSecondary} name="chevron-right" size={20} />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.settingsRow}>{content}</View>;
  return (
    <Pressable
      accessibilityLabel={`${label}${value ? `, ${value}` : ""}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

const sectionTitle = (label: string) => (
  <Text style={styles.sectionTitle}>{label}</Text>
);

const friendlyError = (error: unknown) =>
  error instanceof SettingsApiError &&
  (error.code === "REAUTH_REQUIRED" || error.code === "RECENT_AUTH_REQUIRED")
    ? "Bạn cần đăng nhập lại trước khi thực hiện hành động này. Cài đặt cũ vẫn được giữ nguyên."
    : error instanceof SettingsApiError && error.kind === "offline"
      ? "Không có kết nối tới máy chủ. Cài đặt cũ vẫn được giữ nguyên."
      : error instanceof SettingsApiError && error.kind === "timeout"
        ? "Yêu cầu quá thời gian chờ và chưa được xác nhận. Cài đặt cũ vẫn được giữ nguyên."
        : "Máy chủ chưa xác nhận thay đổi. Cài đặt cũ vẫn được giữ nguyên.";

const requestStatusLabel: Record<string, string> = {
  requested: "đã tiếp nhận",
  processing: "đang xử lý",
  ready: "đã sẵn sàng",
  completed: "đã hoàn tất",
  failed: "cần thử lại",
  scheduled: "đã lên lịch",
  cancelled: "đã hủy",
};

const formatDeadline = (projection: SettingsProjection) =>
  projection.safetyPlan.nextDeadlineAt
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: projection.profile.timezone,
      }).format(new Date(projection.safetyPlan.nextDeadlineAt))
    : "Không có thời hạn đang hoạt động";

const SettingsContent = ({ session }: { session: AuthSession }) => {
  const router = useRouter();
  const auth = useAuth();
  const { draft, requestPush, syncAuthoritativeSettings } = useOnboarding();
  const queryClient = useQueryClient();
  const api = useMemo(() => createSettingsApi(session), [session]);
  const [displayNameEdit, setDisplayName] = useState<string | null>(null);
  const [timezoneEdit, setTimezone] = useState<string | null>(null);
  const [intervalHoursEdit, setIntervalHours] =
    useState<SettingsInterval | null>(null);
  const [pushPermission, setPushPermission] = useState<PushDecision>(
    draft.pushDecision,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: settingsQueryKey(session.user.id),
    queryFn: api.getSettings,
    retry: 1,
  });
  const { refetch: refetchSettings } = settingsQuery;

  const displayName =
    displayNameEdit ??
    settingsQuery.data?.profile.displayName ??
    draft.displayName ??
    "";
  const timezone =
    timezoneEdit ??
    settingsQuery.data?.profile.timezone ??
    draft.timezone ??
    "UTC";
  const intervalHours =
    intervalHoursEdit ??
    settingsQuery.data?.safetyPlan.intervalHours ??
    draft.intervalHours ??
    36;

  const refreshDeviceState = useCallback(() => {
    void getPushPermission()
      .then(setPushPermission)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshDeviceState();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshDeviceState();
        void refetchSettings();
      }
    });
    return () => subscription.remove();
  }, [refreshDeviceState, refetchSettings]);

  const applyProjection = useCallback(
    async (projection: SettingsProjection, message: string) => {
      queryClient.setQueryData(settingsQueryKey(session.user.id), projection);
      await syncAuthoritativeSettings({
        displayName: projection.profile.displayName,
        timezone: projection.profile.timezone,
        intervalHours: projection.safetyPlan.intervalHours,
      });
      void queryClient.invalidateQueries({
        queryKey: safetyStatusQueryKey(session.user.id),
      });
      void queryClient.invalidateQueries({
        queryKey: historyQueryKey(session.user.id),
      });
      setDisplayName(null);
      setTimezone(null);
      setIntervalHours(null);
      setFormError(null);
      setResultMessage(message);
    },
    [queryClient, session.user.id, syncAuthoritativeSettings],
  );

  const profileMutation = useMutation({
    mutationFn: () =>
      api.updateProfile({
        displayName: displayName.trim(),
        timezone: timezone.trim(),
      }),
    onSuccess: (projection) =>
      applyProjection(projection, "Máy chủ đã cập nhật hồ sơ và lịch an toàn."),
  });
  const planMutation = useMutation({
    mutationFn: () => api.updateSafetyPlan(intervalHours),
    onSuccess: (projection) =>
      applyProjection(
        projection,
        `Máy chủ đã tạo lịch ${projection.safetyPlan.intervalHours} giờ và trả về thời hạn mới.`,
      ),
  });
  const disableMutation = useMutation({
    mutationFn: async () => {
      const key = await getOrCreateSettingsAttempt(
        session.user.id,
        "disable-plan",
      );
      return api.disableSafetyPlan(key);
    },
    onSuccess: async (projection) => {
      await clearSettingsAttempt(session.user.id, "disable-plan");
      await applyProjection(
        projection,
        "Máy chủ đã xác nhận tắt kế hoạch an toàn.",
      );
    },
  });
  const exportMutation = useMutation({
    mutationFn: async () => {
      const key = await getOrCreateSettingsAttempt(
        session.user.id,
        "account-export",
      );
      return api.requestAccountExport(key);
    },
    onSuccess: async (projection) => {
      await clearSettingsAttempt(session.user.id, "account-export");
      await applyProjection(
        projection,
        "Yêu cầu xuất dữ liệu đã được máy chủ tiếp nhận.",
      );
    },
  });
  const deletionMutation = useMutation({
    mutationFn: async () => {
      const key = await getOrCreateSettingsAttempt(
        session.user.id,
        "account-deletion",
      );
      return api.requestAccountDeletion(key);
    },
    onSuccess: async (projection) => {
      await clearSettingsAttempt(session.user.id, "account-deletion");
      await applyProjection(
        projection,
        "Yêu cầu xóa tài khoản đã được máy chủ tiếp nhận theo chính sách lưu giữ.",
      );
    },
  });
  const pushMutation = useMutation({
    mutationFn: requestPush,
    onMutate: () => {
      setFormError(null);
      setResultMessage(null);
    },
    onSuccess: async (result) => {
      setPushPermission(result.decision);
      const refreshed = await refetchSettings();
      if (refreshed.data?.push.registration === "registered") {
        setResultMessage("Thiết bị đã đăng ký nhận thông báo đẩy.");
        return;
      }
      if (result.decision === "denied") {
        setFormError(
          "Thông báo đang bị tắt. Hãy mở cài đặt hệ thống để cấp quyền rồi thử lại.",
        );
        return;
      }
      setFormError(
        "Đã có quyền thông báo nhưng máy chủ chưa xác nhận thiết bị. Hãy kiểm tra kết nối rồi thử lại.",
      );
    },
    onError: () =>
      setFormError(
        "Không thể đăng ký thông báo đẩy lúc này. Hãy kiểm tra kết nối rồi thử lại.",
      ),
  });
  const signOutMutation = useMutation({
    mutationFn: auth.signOut,
    onSuccess: () => router.replace("/"),
  });

  if (settingsQuery.isPending) {
    return (
      <Screen scrollable={false}>
        <Text accessibilityRole="header" style={styles.title}>
          Cài đặt
        </Text>
        <LoadingState label="Đang tải cài đặt từ máy chủ…" />
      </Screen>
    );
  }
  const projection = settingsQuery.data;
  if (!projection) {
    return (
      <Screen scrollable={false}>
        <Text accessibilityRole="header" style={styles.title}>
          Cài đặt
        </Text>
        <ErrorState
          message="Không thể tải projection cài đặt an toàn."
          onRetry={() => void settingsQuery.refetch()}
        />
      </Screen>
    );
  }

  const profileInvalid = !displayName.trim() || displayName.trim().length > 80;
  const timezoneInvalid = !isIanaTimezone(timezone.trim());
  const pushReady =
    pushPermission === "granted" &&
    projection.push.registration === "registered";
  const mutationError =
    profileMutation.error ??
    planMutation.error ??
    disableMutation.error ??
    exportMutation.error ??
    deletionMutation.error ??
    signOutMutation.error;

  const saveProfile = () => {
    if (profileInvalid) {
      setFormError("Tên hiển thị cần từ 1 đến 80 ký tự.");
      return;
    }
    if (timezoneInvalid) {
      setFormError("Hãy nhập múi giờ IANA hợp lệ, ví dụ Asia/Ho_Chi_Minh.");
      return;
    }
    setResultMessage(null);
    profileMutation.mutate();
  };

  const confirmDisable = () =>
    Alert.alert(
      "Tắt kế hoạch an toàn?",
      "Sau khi máy chủ xác nhận, hệ thống sẽ không tạo deadline hoặc cảnh báo mới. Máy chủ có thể yêu cầu bạn đăng nhập lại.",
      [
        { text: "Giữ kế hoạch", style: "cancel" },
        {
          text: "Tắt kế hoạch",
          style: "destructive",
          onPress: () => disableMutation.mutate(),
        },
      ],
    );
  const confirmDeletion = () =>
    Alert.alert(
      "Yêu cầu xóa tài khoản?",
      "Đây là yêu cầu theo quy trình lưu giữ dữ liệu, không xóa ngay trên thiết bị. Máy chủ có thể yêu cầu xác thực lại.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi yêu cầu xóa",
          style: "destructive",
          onPress: () => deletionMutation.mutate(),
        },
      ],
    );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Cài đặt
        </Text>
        {settingsQuery.isFetching ? (
          <Text style={styles.syncing}>Đang đồng bộ…</Text>
        ) : null}
      </View>
      {env.dataMode === "fixture" ? (
        <Badge label="Dữ liệu mẫu · không có bảo vệ thật" variant="warning" />
      ) : null}

      <Card>
        <View style={styles.profileHeading}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {projection.profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.profileName}>
              {projection.profile.displayName}
            </Text>
            <Text style={styles.rowValue}>{projection.profile.email}</Text>
          </View>
        </View>
        <Input
          accessibilityLabel="Tên hiển thị"
          autoCapitalize="words"
          error={profileInvalid && formError ? formError : undefined}
          label="Tên hiển thị"
          maxLength={80}
          onChangeText={setDisplayName}
          value={displayName}
        />
        <Input
          accessibilityLabel="Múi giờ IANA"
          autoCapitalize="none"
          autoCorrect={false}
          error={timezoneInvalid && formError ? formError : undefined}
          helperText="Ví dụ: Asia/Ho_Chi_Minh"
          label="Múi giờ"
          onChangeText={setTimezone}
          value={timezone}
        />
        <Button
          accessibilityLabel="Lưu tên hiển thị và múi giờ"
          label="Lưu hồ sơ"
          loading={profileMutation.isPending}
          onPress={saveProfile}
          variant="secondary"
        />
      </Card>

      {sectionTitle("KẾ HOẠCH AN TOÀN")}
      <Card>
        <Text style={styles.fieldLabel}>Chu kỳ điểm danh</Text>
        <View style={styles.intervalRow}>
          {([24, 36, 48] as const).map((hours) => {
            const selected = intervalHours === hours;
            return (
              <Pressable
                key={hours}
                accessibilityLabel={`Chu kỳ ${hours} giờ`}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected,
                  disabled: !projection.allowedActions.canUpdateSafetyPlan,
                }}
                disabled={!projection.allowedActions.canUpdateSafetyPlan}
                onPress={() => setIntervalHours(hours)}
                style={[
                  styles.intervalOption,
                  selected && styles.intervalSelected,
                ]}
              >
                <Text
                  style={[
                    styles.intervalText,
                    selected && styles.intervalTextSelected,
                  ]}
                >
                  {hours} giờ
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.deadline}>
          Thời hạn do máy chủ trả về: {formatDeadline(projection)}
        </Text>
        <Button
          accessibilityLabel="Lưu chu kỳ và yêu cầu máy chủ tạo lịch mới"
          disabled={!projection.allowedActions.canUpdateSafetyPlan}
          label="Lưu chu kỳ"
          loading={planMutation.isPending}
          onPress={() => {
            setResultMessage(null);
            planMutation.mutate();
          }}
          variant="secondary"
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="group"
          label="Liên hệ tin cậy"
          onPress={() => router.push("/contacts")}
          value={`${projection.contacts.acceptedCount}/${projection.contacts.totalCount} đã sẵn sàng`}
        />
        <SettingsRow
          icon="shield"
          label="Trạng thái bảo vệ"
          value={
            projection.safetyPlan.state === "inactive"
              ? "Đã tắt"
              : projection.safetyPlan.state === "snoozed"
                ? "Đang tạm hoãn"
                : "Đang hoạt động"
          }
        />
      </Card>

      {sectionTitle("THÔNG BÁO")}
      <Card>
        <SettingsRow
          icon={pushReady ? "notifications-active" : "notifications-off"}
          label="Thông báo đẩy"
          onPress={() => {
            if (pushPermission === "denied") {
              void Linking.openSettings();
              return;
            }
            pushMutation.mutate();
          }}
          value={
            pushReady
              ? "Đã bật và đăng ký"
              : pushMutation.isPending
                ? "Đang đăng ký thiết bị…"
                : pushPermission === "denied"
                  ? "Đang tắt · Mở cài đặt"
                  : "Chưa sẵn sàng · Thử đăng ký"
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="mail-outline"
          label="Email của tôi"
          value={projection.profile.email}
        />
      </Card>

      {sectionTitle("KIỂM TRA HỆ THỐNG")}
      <Card>
        <SettingsRow
          icon="campaign"
          label="Diễn tập cảnh báo"
          onPress={() => router.push("/sos/drill")}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="security"
          label="Kiểm tra quyền thiết bị"
          onPress={() => void Linking.openSettings()}
        />
      </Card>

      {sectionTitle("DỮ LIỆU CỦA TÔI")}
      <Card>
        <Text style={styles.helpText}>
          Xuất và xóa dữ liệu là quy trình phía máy chủ. App chỉ báo thành công
          sau khi nhận trạng thái yêu cầu.
        </Text>
        <Button
          accessibilityLabel="Gửi yêu cầu xuất dữ liệu tài khoản"
          disabled={!projection.allowedActions.canRequestExport}
          label={
            projection.account.exportRequest
              ? `Xuất dữ liệu: ${requestStatusLabel[projection.account.exportRequest.status]}`
              : "Yêu cầu xuất dữ liệu"
          }
          loading={exportMutation.isPending}
          onPress={() => exportMutation.mutate()}
          variant="secondary"
        />
        <Button
          accessibilityLabel="Gửi yêu cầu xóa tài khoản"
          disabled={!projection.allowedActions.canRequestDeletion}
          label={
            projection.account.deletionRequest
              ? `Xóa tài khoản: ${requestStatusLabel[projection.account.deletionRequest.status]}`
              : "Yêu cầu xóa tài khoản"
          }
          loading={deletionMutation.isPending}
          onPress={confirmDeletion}
          variant="secondary"
        />
      </Card>

      {resultMessage ? (
        <Card muted>
          <View style={styles.inlineRow}>
            <AppIcon color={colors.success} name="check-circle" />
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {resultMessage}
            </Text>
          </View>
        </Card>
      ) : null}
      {mutationError ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {friendlyError(mutationError)}
          </Text>
        </Card>
      ) : null}

      <Button
        accessibilityLabel="Đăng xuất khỏi I’m Okay"
        label="Đăng xuất"
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
        variant="secondary"
      />
      <Button
        accessibilityLabel="Tắt kế hoạch an toàn"
        disabled={!projection.allowedActions.canDisableSafetyPlan}
        label={
          projection.safetyPlan.state === "inactive"
            ? "Kế hoạch an toàn đã tắt"
            : "Tắt kế hoạch an toàn"
        }
        loading={disableMutation.isPending}
        onPress={confirmDisable}
        variant="danger"
      />
      <Text style={styles.version}>
        I’m Okay {Constants.expoConfig?.version ?? "0.1.0"}
      </Text>
    </Screen>
  );
};

export default function SettingsScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <SettingsContent session={session} />;
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { ...typography.headingLarge, color: colors.textPrimary },
  syncing: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: -spacing.sm,
  },
  profileHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { ...typography.headingMedium, color: colors.primary },
  profileName: { ...typography.label, color: colors.textPrimary },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: sizes.minimumTouchTarget,
  },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  rowValue: { ...typography.caption, color: colors.textSecondary },
  pressed: { opacity: 0.7 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  fieldLabel: { ...typography.label, color: colors.textPrimary },
  intervalRow: { flexDirection: "row", gap: spacing.xs },
  intervalOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: sizes.minimumTouchTarget,
  },
  intervalSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  intervalText: { ...typography.bodyMedium, color: colors.textSecondary },
  intervalTextSelected: { ...typography.label, color: colors.primary },
  deadline: { ...typography.caption, color: colors.textSecondary },
  helpText: { ...typography.bodyMedium, color: colors.textSecondary },
  inlineRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  successText: { ...typography.bodyMedium, color: colors.success, flex: 1 },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: { ...typography.bodyMedium, color: colors.danger },
  dangerText: { color: colors.danger },
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
