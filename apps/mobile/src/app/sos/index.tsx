import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAccessibilityFocus } from "@/features/accessibility/focus";
import { AlertAcceptedState } from "@/features/alerts/AlertAcceptedState";
import { createAlertsApi } from "@/features/alerts/api";
import {
  clearAlertAttempt,
  getOrCreateAlertAttempt,
  shouldRetainAlertAttempt,
} from "@/features/alerts/attemptStore";
import { useAlertContextRefresh } from "@/features/alerts/hooks";
import { channelsCopy } from "@/features/alerts/presentation";
import { alertContextQueryKey } from "@/features/alerts/query";
import { SosHoldButton } from "@/features/alerts/SosHoldButton";
import {
  AlertsApiError,
  type AlertContextSnapshot,
} from "@/features/alerts/types";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import {
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import { colors, radii, spacing, typography } from "@/theme";

const errorMessage = (_error: unknown, locale: AppLocale) =>
  translate("sos.error", "Chưa thể xử lý yêu cầu trợ giúp.", {}, locale);

const SosContent = ({ session }: { session: AuthSession }) => {
  const { locale, t } = useI18n();
  const api = useMemo(() => createAlertsApi(session), [session]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [twoStep, setTwoStep] = useState(false);
  const { focus: focusTwoStep, ref: twoStepTitleRef } =
    useAccessibilityFocus<Text>(
      t("sos.twoStepFocus", "Bước hai trên hai, xác nhận gửi SOS."),
    );
  const [accepted, setAccepted] = useState<AlertContextSnapshot | null>(null);
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

  useEffect(() => {
    if (twoStep) focusTwoStep();
  }, [focusTwoStep, twoStep]);

  const sosMutation = useMutation({
    mutationFn: async () => {
      const key = await getOrCreateAlertAttempt(session.user.id, "sos");
      return api.sendSos(key);
    },
    onSuccess: async (result) => {
      await clearAlertAttempt(session.user.id, "sos");
      queryClient.setQueryData(queryKey, result);
      setAccepted(result);
    },
    onError: async (error) => {
      if (!shouldRetainAlertAttempt(error)) {
        await clearAlertAttempt(session.user.id, "sos");
      }
    },
  });

  if (accepted) {
    return (
      <AlertAcceptedState
        onHome={() => router.replace("/(main)")}
        onStatus={() => router.replace("/warning")}
        snapshot={accepted}
        source="sos"
      />
    );
  }
  if (contextQuery.isPending) {
    return (
      <Screen scrollable={false}>
        <LoadingState
          label={t("sos.loading", "Đang kiểm tra liên hệ sẵn sàng…")}
        />
      </Screen>
    );
  }
  const snapshot = contextQuery.data;
  if (!snapshot) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          message={errorMessage(contextQuery.error, locale)}
          onRetry={refresh}
          title={t("sos.unavailable", "Chưa thể chuẩn bị SOS")}
        />
      </Screen>
    );
  }

  const { projection } = snapshot;
  const names = projection.contactSummary.displayNames;
  const canSend = projection.availableActions.canSendSos && names.length > 0;

  return (
    <Screen>
      <View style={styles.heroIcon}>
        <AppIcon color={colors.primary} name="health-and-safety" size={44} />
      </View>
      <Text accessibilityRole="header" style={styles.heading}>
        {t("sos.title", "Bạn cần người thân kiểm tra ngay?")}
      </Text>
      <Text style={styles.intro}>
        {t(
          "sos.intro",
          "I’m Okay sẽ yêu cầu máy chủ cảnh báo ngay cho các liên hệ đã xác nhận, không chờ thời hạn điểm danh.",
        )}
      </Text>

      {env.dataMode === "fixture" ? (
        <View style={styles.centered}>
          <Badge
            label={t("sos.fixture", "Dữ liệu mẫu · không gửi cảnh báo thật")}
            variant="warning"
          />
        </View>
      ) : null}

      <Card muted>
        <View style={styles.infoRow}>
          <AppIcon color={colors.primary} name="groups" />
          <Text style={styles.infoText}>
            {t(
              "sos.eligibleContacts",
              "{count} liên hệ đã xác nhận sẽ được thông báo",
              { count: projection.contactSummary.eligibleCount },
            )}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <AppIcon color={colors.primary} name="notifications-active" />
          <Text style={styles.infoText}>
            {t("sos.channels", "Kênh: {channels}", {
              channels: channelsCopy(projection.channelSummary.sos),
            })}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <AppIcon color={colors.primary} name="location-off" />
          <Text style={styles.infoText}>
            {t(
              "sos.locationNotShared",
              "Vị trí không được chia sẻ trong phiên bản này",
            )}
          </Text>
        </View>
      </Card>

      {names.length > 0 ? (
        <Text style={styles.names}>
          {t("sos.notifyNames", "Sẽ báo cho: {names}", {
            names: names.join(", "),
          })}
        </Text>
      ) : (
        <Card style={styles.warningCard}>
          <Text accessibilityLiveRegion="polite" style={styles.warningText}>
            {t(
              "sos.noContact",
              "Chưa có liên hệ đã xác nhận. SOS bị khóa vì hiện không có người đủ điều kiện nhận cảnh báo.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "sos.openContactsA11y",
              "Mở danh sách liên hệ tin cậy",
            )}
            label={t("sos.manageContacts", "Quản lý liên hệ")}
            onPress={() => router.push("/contacts")}
            variant="secondary"
          />
        </Card>
      )}

      {!twoStep ? (
        <>
          <SosHoldButton
            disabled={!canSend}
            loading={sosMutation.isPending}
            onComplete={() => {
              sosMutation.reset();
              sosMutation.mutate();
            }}
          />
          <Button
            accessibilityLabel={t(
              "sos.twoStepA11y",
              "Dùng xác nhận SOS hai bước thay cho nhấn giữ",
            )}
            disabled={!canSend || sosMutation.isPending}
            label={t(
              "sos.twoStep",
              "Không thể nhấn giữ? Dùng xác nhận hai bước",
            )}
            onPress={() => {
              sosMutation.reset();
              setTwoStep(true);
            }}
            variant="secondary"
          />
        </>
      ) : (
        <Card style={styles.twoStepCard}>
          <Text
            accessible
            accessibilityRole="header"
            ref={twoStepTitleRef}
            style={styles.twoStepTitle}
          >
            {t("sos.twoStepTitle", "Bước 2/2 · Xác nhận gửi SOS")}
          </Text>
          <Text style={styles.twoStepBody}>
            {t(
              "sos.twoStepBody",
              "Nút tiếp theo sẽ gửi yêu cầu SOS thật tới máy chủ. Đây không phải nút xem trước.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "sos.confirmA11y",
              "Bước hai, xác nhận gửi SOS tới máy chủ",
            )}
            label={t("sos.confirm", "Xác nhận gửi SOS")}
            loading={sosMutation.isPending}
            onPress={() => sosMutation.mutate()}
            variant="danger"
          />
          <Button
            accessibilityLabel={t(
              "sos.cancelTwoStepA11y",
              "Hủy xác nhận SOS hai bước",
            )}
            disabled={sosMutation.isPending}
            label={t("common.back", "Quay lại")}
            onPress={() => setTwoStep(false)}
            variant="secondary"
          />
        </Card>
      )}

      {sosMutation.error ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {errorMessage(sosMutation.error, locale)}{" "}
            {t(
              "sos.notConfirmed",
              "Không hiển thị thành công khi máy chủ chưa xác nhận.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "sos.checkStatusA11y",
              "Kiểm tra trạng thái SOS từ máy chủ",
            )}
            label={t("sos.checkStatus", "Kiểm tra trạng thái")}
            onPress={refresh}
            variant="secondary"
          />
        </Card>
      ) : null}

      <Button
        accessibilityLabel={t(
          "sos.noHelpA11y",
          "Tôi không cần trợ giúp, đóng mà không gửi SOS",
        )}
        disabled={sosMutation.isPending}
        label={t("sos.noHelp", "Tôi không cần trợ giúp")}
        onPress={() => router.back()}
        variant="secondary"
      />
      <Button
        accessibilityLabel={t(
          "sos.openDrillA11y",
          "Mở diễn tập cảnh báo, không phải SOS thật",
        )}
        disabled={sosMutation.isPending}
        label={t("sos.openDrill", "Mở diễn tập cảnh báo")}
        onPress={() => router.push("/sos/drill")}
        variant="secondary"
      />
      <Text style={styles.disclaimer}>
        {t(
          "sos.disclaimer",
          "I’m Okay không tự động liên hệ dịch vụ cứu hộ. Nếu đang gặp nguy hiểm tức thời, hãy chủ động dùng dịch vụ khẩn cấp phù hợp tại nơi bạn sống.",
        )}
      </Text>
    </Screen>
  );
};

export default function SosScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <SosContent session={session} />;
}

const styles = StyleSheet.create({
  heroIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  centered: { alignItems: "center" },
  heading: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  intro: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  infoRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  infoText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  divider: { backgroundColor: colors.border, height: 1 },
  names: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  warningCard: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warning,
  },
  warningText: { ...typography.bodyMedium, color: colors.warning },
  twoStepCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  twoStepTitle: { ...typography.headingMedium, color: colors.danger },
  twoStepBody: { ...typography.bodyMedium, color: colors.textPrimary },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: { ...typography.bodyMedium, color: colors.danger },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
