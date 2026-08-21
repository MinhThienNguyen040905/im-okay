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
import {
  getLocaleTag,
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
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
import { SettingsErrorCard } from "@/features/settings/SettingsErrorCard";
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
      </View>
      {value ? (
        <Text numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
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

const friendlyError = (error: unknown, locale: AppLocale) =>
  error instanceof SettingsApiError &&
  (error.code === "REAUTH_REQUIRED" || error.code === "RECENT_AUTH_REQUIRED")
    ? translate(
        "settings.reauthRequired",
        "Bạn cần đăng nhập lại trước khi thực hiện hành động này. Cài đặt cũ vẫn được giữ nguyên.",
        {},
        locale,
      )
    : error instanceof SettingsApiError && error.kind === "offline"
      ? translate(
          "settings.offline",
          "Không có kết nối tới máy chủ. Cài đặt cũ vẫn được giữ nguyên.",
          {},
          locale,
        )
      : error instanceof SettingsApiError && error.kind === "timeout"
        ? translate(
            "settings.timeout",
            "Yêu cầu quá thời gian chờ và chưa được xác nhận. Cài đặt cũ vẫn được giữ nguyên.",
            {},
            locale,
          )
        : translate(
            "settings.notConfirmed",
            "Máy chủ chưa xác nhận thay đổi. Cài đặt cũ vẫn được giữ nguyên.",
            {},
            locale,
          );

const requestStatusLabel = (status: string, locale: AppLocale) => {
  const copy = {
    requested: ["settings.requestStatusRequested", "đã tiếp nhận"],
    processing: ["settings.requestStatusProcessing", "đang xử lý"],
    ready: ["settings.requestStatusReady", "đã sẵn sàng"],
    completed: ["settings.requestStatusCompleted", "đã hoàn tất"],
    failed: ["settings.requestStatusFailed", "cần thử lại"],
    scheduled: ["settings.requestStatusScheduled", "đã lên lịch"],
    cancelled: ["settings.requestStatusCancelled", "đã hủy"],
  } as const;
  const [key, fallback] = copy[status as keyof typeof copy] ?? [
    "settings.notConfirmed",
    status,
  ];
  return translate(key, fallback, {}, locale);
};

const formatDeadline = (projection: SettingsProjection, locale: AppLocale) =>
  projection.safetyPlan.nextDeadlineAt
    ? new Intl.DateTimeFormat(getLocaleTag(locale), {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: projection.profile.timezone,
      }).format(new Date(projection.safetyPlan.nextDeadlineAt))
    : translate(
        "settings.deadlineNone",
        "Không có thời hạn đang hoạt động",
        {},
        locale,
      );

const SettingsContent = ({ session }: { session: AuthSession }) => {
  const { locale, setLocale, t } = useI18n();
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
  const [pushError, setPushError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);

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
      setProfileExpanded(false);
      setPlanExpanded(false);
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
      applyProjection(
        projection,
        t(
          "settings.profileSaved",
          "Máy chủ đã cập nhật hồ sơ và lịch an toàn.",
        ),
      ),
  });
  const planMutation = useMutation({
    mutationFn: () => api.updateSafetyPlan(intervalHours),
    onSuccess: (projection) =>
      applyProjection(
        projection,
        t(
          "settings.planSaved",
          "Máy chủ đã tạo lịch {hours} giờ và trả về thời hạn mới.",
          { hours: projection.safetyPlan.intervalHours },
        ),
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
        t(
          "settings.planDisabledSaved",
          "Máy chủ đã xác nhận tắt kế hoạch an toàn.",
        ),
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
        t(
          "settings.exportRequested",
          "Yêu cầu xuất dữ liệu đã được máy chủ tiếp nhận.",
        ),
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
        t(
          "settings.deletionRequested",
          "Yêu cầu xóa tài khoản đã được máy chủ tiếp nhận theo chính sách lưu giữ.",
        ),
      );
    },
  });
  const pushMutation = useMutation({
    mutationFn: requestPush,
    onMutate: () => {
      setPushError(null);
      setResultMessage(null);
    },
    onSuccess: async (result) => {
      setPushPermission(result.decision);
      const refreshed = await refetchSettings();
      if (refreshed.data?.push.registration === "registered") {
        setResultMessage(
          t("settings.pushSaved", "Thiết bị đã đăng ký nhận thông báo đẩy."),
        );
        return;
      }
      if (result.decision === "denied") {
        setPushError(
          t(
            "settings.pushDenied",
            "Thông báo đang bị tắt. Hãy mở cài đặt hệ thống để cấp quyền rồi thử lại.",
          ),
        );
        return;
      }
      setPushError(
        t(
          "settings.pushNotRegistered",
          "Đã có quyền thông báo nhưng máy chủ chưa xác nhận thiết bị. Hãy kiểm tra kết nối rồi thử lại.",
        ),
      );
    },
    onError: () =>
      setPushError(
        t(
          "settings.pushFailed",
          "Không thể đăng ký thông báo đẩy lúc này. Hãy kiểm tra kết nối rồi thử lại.",
        ),
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
          {t("settings.title", "Cài đặt")}
        </Text>
        <LoadingState
          label={t("settings.loading", "Đang tải cài đặt từ máy chủ…")}
        />
      </Screen>
    );
  }
  const projection = settingsQuery.data;
  if (!projection) {
    return (
      <Screen scrollable={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("settings.title", "Cài đặt")}
        </Text>
        <ErrorState
          message={t(
            "settings.loadFailed",
            "Không thể tải projection cài đặt an toàn.",
          )}
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
      setFormError(
        t("settings.profileInvalid", "Tên hiển thị cần từ 1 đến 80 ký tự."),
      );
      return;
    }
    if (timezoneInvalid) {
      setFormError(
        t(
          "settings.timezoneInvalid",
          "Hãy nhập múi giờ IANA hợp lệ, ví dụ Asia/Ho_Chi_Minh.",
        ),
      );
      return;
    }
    setResultMessage(null);
    profileMutation.mutate();
  };

  const confirmDisable = () =>
    Alert.alert(
      t("settings.disableConfirmTitle", "Tắt kế hoạch an toàn?"),
      t(
        "settings.disableConfirmBody",
        "Sau khi máy chủ xác nhận, hệ thống sẽ không tạo deadline hoặc cảnh báo mới. Máy chủ có thể yêu cầu bạn đăng nhập lại.",
      ),
      [
        { text: t("settings.keepPlan", "Giữ kế hoạch"), style: "cancel" },
        {
          text: t("settings.disablePlan", "Tắt kế hoạch an toàn"),
          style: "destructive",
          onPress: () => disableMutation.mutate(),
        },
      ],
    );
  const confirmDeletion = () =>
    Alert.alert(
      t("settings.deleteConfirmTitle", "Yêu cầu xóa tài khoản?"),
      t(
        "settings.deleteConfirmBody",
        "Đây là yêu cầu theo quy trình lưu giữ dữ liệu, không xóa ngay trên thiết bị. Máy chủ có thể yêu cầu xác thực lại.",
      ),
      [
        { text: t("settings.cancel", "Hủy"), style: "cancel" },
        {
          text: t("settings.deleteRequest", "Gửi yêu cầu xóa"),
          style: "destructive",
          onPress: () => deletionMutation.mutate(),
        },
      ],
    );
  const chooseLanguage = () =>
    Alert.alert(
      t("common.chooseLanguage", "Chọn ngôn ngữ hiển thị"),
      t("common.languageSaved", "Ngôn ngữ được lưu trên thiết bị này."),
      [
        {
          text: "Tiếng Việt",
          onPress: () => void setLocale("vi"),
        },
        { text: "English", onPress: () => void setLocale("en") },
        { text: t("common.cancel", "Hủy"), style: "cancel" },
      ],
    );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("settings.title", "Cài đặt")}
        </Text>
        {settingsQuery.isFetching ? (
          <Text style={styles.syncing}>
            {t("settings.syncing", "Đang đồng bộ…")}
          </Text>
        ) : null}
      </View>
      {env.dataMode === "fixture" ? (
        <Badge
          label={t("settings.fixture", "Dữ liệu mẫu · không có bảo vệ thật")}
          variant="warning"
        />
      ) : null}

      {sectionTitle(t("settings.languageSection", "NGÔN NGỮ"))}
      <Card style={styles.listCard}>
        <SettingsRow
          icon="language"
          label={t("common.language", "Ngôn ngữ")}
          onPress={chooseLanguage}
          value={
            locale === "vi"
              ? t("common.vietnamese", "Tiếng Việt")
              : t("common.english", "English")
          }
        />
      </Card>

      <Card style={styles.profileCard}>
        <Pressable
          accessibilityLabel={t(
            "settings.profileA11y",
            "{action} chỉnh sửa hồ sơ",
            {
              action: profileExpanded
                ? t("settings.close", "Đóng")
                : t("settings.open", "Mở"),
            },
          )}
          accessibilityRole="button"
          onPress={() => setProfileExpanded((expanded) => !expanded)}
          style={({ pressed }) => [
            styles.profileHeading,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {projection.profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.profileName}>
              {projection.profile.displayName}
            </Text>
            <Text numberOfLines={1} style={styles.profileEmail}>
              {projection.profile.email}
            </Text>
          </View>
          <AppIcon
            color={colors.textSecondary}
            name={profileExpanded ? "expand-less" : "chevron-right"}
            size={20}
          />
        </Pressable>
        {profileExpanded ? (
          <View style={styles.inlineEditor}>
            <View style={styles.divider} />
            <Input
              accessibilityLabel={t("settings.displayName", "Tên hiển thị")}
              autoCapitalize="words"
              error={profileInvalid && formError ? formError : undefined}
              label={t("settings.displayName", "Tên hiển thị")}
              maxLength={80}
              onChangeText={setDisplayName}
              value={displayName}
            />
            <Input
              accessibilityLabel={t("settings.timezoneA11y", "Múi giờ IANA")}
              autoCapitalize="none"
              autoCorrect={false}
              error={timezoneInvalid && formError ? formError : undefined}
              helperText={t(
                "settings.timezoneExample",
                "Ví dụ: Asia/Ho_Chi_Minh",
              )}
              label={t("settings.timezone", "Múi giờ")}
              onChangeText={setTimezone}
              value={timezone}
            />
            <Button
              accessibilityLabel={t(
                "settings.saveProfileA11y",
                "Lưu tên hiển thị và múi giờ",
              )}
              label={t("settings.saveProfile", "Lưu hồ sơ")}
              loading={profileMutation.isPending}
              onPress={saveProfile}
              variant="secondary"
            />
          </View>
        ) : null}
      </Card>

      {sectionTitle(t("settings.safetyPlanSection", "KẾ HOẠCH AN TOÀN"))}
      <Card style={styles.listCard}>
        <SettingsRow
          icon="timer"
          label={t("settings.interval", "Chu kỳ điểm danh")}
          onPress={() => setPlanExpanded((expanded) => !expanded)}
          value={t("settings.hours", "{hours} giờ", {
            hours: projection.safetyPlan.intervalHours,
          })}
        />
        {planExpanded ? (
          <View style={styles.planEditor}>
            <View style={styles.intervalRow}>
              {([24, 36, 48] as const).map((hours) => {
                const selected = intervalHours === hours;
                return (
                  <Pressable
                    key={hours}
                    accessibilityLabel={t(
                      "settings.intervalA11y",
                      "Chu kỳ {hours} giờ",
                      { hours },
                    )}
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
                      {t("settings.hours", "{hours} giờ", { hours })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.deadline}>
              {t(
                "settings.serverDeadline",
                "Thời hạn do máy chủ trả về: {time}",
                { time: formatDeadline(projection, locale) },
              )}
            </Text>
            <Button
              accessibilityLabel={t(
                "settings.saveIntervalA11y",
                "Lưu chu kỳ và yêu cầu máy chủ tạo lịch mới",
              )}
              disabled={!projection.allowedActions.canUpdateSafetyPlan}
              label={t("settings.saveInterval", "Lưu chu kỳ")}
              loading={planMutation.isPending}
              onPress={() => {
                setResultMessage(null);
                planMutation.mutate();
              }}
              variant="secondary"
            />
          </View>
        ) : null}
        <View style={styles.divider} />
        <SettingsRow
          icon="group"
          label={t("settings.contacts", "Liên hệ tin cậy")}
          onPress={() => router.push("/contacts")}
          value={t("settings.contactsReady", "{ready}/{total} đã sẵn sàng", {
            ready: projection.contacts.acceptedCount,
            total: projection.contacts.totalCount,
          })}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="shield"
          label={t("settings.protection", "Trạng thái bảo vệ")}
          value={
            projection.safetyPlan.state === "inactive"
              ? t("settings.protectionInactive", "Đã tắt")
              : projection.safetyPlan.state === "snoozed"
                ? t("settings.protectionSnoozed", "Đang tạm hoãn")
                : t("settings.protectionActive", "Đang hoạt động")
          }
        />
      </Card>

      {sectionTitle(t("settings.notificationsSection", "THÔNG BÁO"))}
      <Card style={styles.listCard}>
        <SettingsRow
          icon={pushReady ? "notifications-active" : "notifications-off"}
          label={t("settings.push", "Thông báo đẩy")}
          onPress={() => {
            if (pushPermission === "denied") {
              void Linking.openSettings();
              return;
            }
            pushMutation.mutate();
          }}
          value={
            pushReady
              ? t("settings.pushRegistered", "Đã bật và đăng ký")
              : pushMutation.isPending
                ? t("settings.pushRegistering", "Đang đăng ký thiết bị…")
                : pushPermission === "denied"
                  ? t("settings.pushDisabled", "Đang tắt · Mở cài đặt")
                  : t("settings.pushUnavailable", "Chưa sẵn sàng · Thử đăng ký")
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="mail-outline"
          label={t("settings.email", "Email của tôi")}
          value={projection.profile.email}
        />
      </Card>

      {sectionTitle(t("settings.systemSection", "KIỂM TRA HỆ THỐNG"))}
      <Card style={styles.listCard}>
        <SettingsRow
          icon="campaign"
          label={t("settings.drill", "Diễn tập cảnh báo")}
          onPress={() => router.push("/sos/drill")}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="security"
          label={t("settings.devicePermissions", "Kiểm tra quyền thiết bị")}
          onPress={() => void Linking.openSettings()}
        />
      </Card>

      {sectionTitle(t("settings.dataSection", "DỮ LIỆU CỦA TÔI"))}
      <Card>
        <Text style={styles.helpText}>
          {t(
            "settings.dataHelp",
            "Xuất và xóa dữ liệu là quy trình phía máy chủ. App chỉ báo thành công sau khi nhận trạng thái yêu cầu.",
          )}
        </Text>
        <Button
          accessibilityLabel={t(
            "settings.exportA11y",
            "Gửi yêu cầu xuất dữ liệu tài khoản",
          )}
          disabled={!projection.allowedActions.canRequestExport}
          label={
            projection.account.exportRequest
              ? t("settings.exportStatus", "Xuất dữ liệu: {status}", {
                  status: requestStatusLabel(
                    projection.account.exportRequest.status,
                    locale,
                  ),
                })
              : t("settings.export", "Yêu cầu xuất dữ liệu")
          }
          loading={exportMutation.isPending}
          onPress={() => exportMutation.mutate()}
          variant="secondary"
        />
        <Button
          accessibilityLabel={t(
            "settings.deletionA11y",
            "Gửi yêu cầu xóa tài khoản",
          )}
          disabled={!projection.allowedActions.canRequestDeletion}
          label={
            projection.account.deletionRequest
              ? t("settings.deletionStatus", "Xóa tài khoản: {status}", {
                  status: requestStatusLabel(
                    projection.account.deletionRequest.status,
                    locale,
                  ),
                })
              : t("settings.deletion", "Yêu cầu xóa tài khoản")
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
      <SettingsErrorCard message={pushError} />
      <SettingsErrorCard
        message={mutationError ? friendlyError(mutationError, locale) : null}
      />

      <Button
        accessibilityLabel={t(
          "settings.signOutA11y",
          "Đăng xuất khỏi I’m Okay",
        )}
        label={t("settings.signOut", "Đăng xuất")}
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
        variant="secondary"
      />
      <Button
        accessibilityLabel={t(
          "settings.disablePlanA11y",
          "Tắt kế hoạch an toàn",
        )}
        disabled={!projection.allowedActions.canDisableSafetyPlan}
        label={
          projection.safetyPlan.state === "inactive"
            ? t("settings.planDisabled", "Kế hoạch an toàn đã tắt")
            : t("settings.disablePlan", "Tắt kế hoạch an toàn")
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
  title: { ...typography.headingLarge, color: colors.primary },
  syncing: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: -spacing.sm,
  },
  profileCard: { padding: spacing.md },
  profileHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
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
  profileEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inlineEditor: { gap: spacing.md },
  listCard: { gap: 0, overflow: "hidden", padding: 0 },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  rowLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  rowValue: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
    maxWidth: "42%",
    textAlign: "right",
  },
  pressed: { opacity: 0.7 },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  planEditor: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
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
  dangerText: { color: colors.danger },
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
