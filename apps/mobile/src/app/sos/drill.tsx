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
import { alertContextQueryKey } from "@/features/alerts/query";
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
  translate("drill.error", "Chưa thể xử lý lượt diễn tập.", {}, locale);

const DrillContent = ({ session }: { session: AuthSession }) => {
  const { locale, t } = useI18n();
  const api = useMemo(() => createAlertsApi(session), [session]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const { focus: focusConfirmation, ref: confirmationTitleRef } =
    useAccessibilityFocus<Text>(
      t("drill.focus", "Bước hai trên hai, xác nhận diễn tập."),
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
    if (armed) focusConfirmation();
  }, [armed, focusConfirmation]);

  const drillMutation = useMutation({
    mutationFn: async () => {
      const attempt = await getOrCreateAlertAttempt(session.user.id, "drill");
      return api.sendDrill(attempt.idempotencyKey);
    },
    onSuccess: async (result) => {
      await clearAlertAttempt(session.user.id, "drill");
      queryClient.setQueryData(queryKey, result);
      setAccepted(result);
    },
    onError: async (error) => {
      if (!shouldRetainAlertAttempt(error)) {
        await clearAlertAttempt(session.user.id, "drill");
      }
    },
  });

  if (accepted) {
    return (
      <AlertAcceptedState
        onHome={() => router.replace("/(main)")}
        onStatus={() => router.replace("/warning")}
        snapshot={accepted}
        source="drill"
      />
    );
  }
  if (contextQuery.isPending) {
    return (
      <Screen scrollable={false}>
        <LoadingState label={t("drill.loading", "Đang chuẩn bị diễn tập…")} />
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
          title={t("drill.unavailable", "Chưa thể chuẩn bị diễn tập")}
        />
      </Screen>
    );
  }

  const { projection } = snapshot;
  const canSend =
    projection.availableActions.canSendDrill &&
    projection.contactSummary.eligibleCount > 0;

  return (
    <Screen>
      <View style={styles.centered}>
        <Badge
          label={t("drill.badge", "DIỄN TẬP · KHÔNG PHẢI SOS")}
          variant="neutral"
        />
        {env.dataMode === "fixture" ? (
          <Badge
            label={t("drill.fixture", "Dữ liệu mẫu · không gửi thông báo thật")}
            variant="warning"
          />
        ) : null}
      </View>
      <View style={styles.heroIcon}>
        <AppIcon color={colors.primary} name="science" size={44} />
      </View>
      <Text accessibilityRole="header" style={styles.heading}>
        {t("drill.title", "Kiểm tra quy trình với nhãn diễn tập")}
      </Text>
      <Text style={styles.intro}>
        {t(
          "drill.intro",
          "Mọi projection và thông báo của lượt này phải mang source “drill” để không bị hiểu nhầm là bạn đang gặp nguy hiểm.",
        )}
      </Text>

      <Card muted>
        <Text style={styles.infoText}>
          {t(
            "drill.eligibleContacts",
            "{count} liên hệ đã xác nhận sẽ nhận nội dung có nhãn DIỄN TẬP.",
            { count: projection.contactSummary.eligibleCount },
          )}
        </Text>
        <Text style={styles.infoText}>
          {t(
            "drill.noEmergency",
            "Không tự gọi dịch vụ cứu hộ và không chia sẻ vị trí.",
          )}
        </Text>
      </Card>

      {!canSend ? (
        <Card style={styles.warningCard}>
          <Text accessibilityLiveRegion="polite" style={styles.warningText}>
            {t(
              "drill.unavailableBody",
              "Chưa thể diễn tập: cần ít nhất một liên hệ đã xác nhận và không có alert khác đang hoạt động.",
            )}
          </Text>
        </Card>
      ) : null}

      {!armed ? (
        <Button
          accessibilityLabel={t(
            "drill.armA11y",
            "Bước một, chuẩn bị xác nhận diễn tập",
          )}
          disabled={!canSend}
          label={t("drill.arm", "Bước 1 · Chuẩn bị diễn tập")}
          onPress={() => {
            drillMutation.reset();
            setArmed(true);
          }}
          variant="secondary"
        />
      ) : (
        <Card style={styles.confirmCard}>
          <Text
            accessible
            accessibilityRole="header"
            ref={confirmationTitleRef}
            style={styles.confirmTitle}
          >
            {t("drill.confirmTitle", "Bước 2/2 · Xác nhận diễn tập")}
          </Text>
          <Text style={styles.infoText}>
            {t(
              "drill.confirmBody",
              "Nút tiếp theo tạo một alert loại drill trên máy chủ. Nội dung gửi ra phải luôn có nhãn diễn tập.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "drill.confirmA11y",
              "Bước hai, xác nhận gửi diễn tập tới máy chủ",
            )}
            label={t("drill.confirm", "Xác nhận gửi diễn tập")}
            loading={drillMutation.isPending}
            onPress={() => drillMutation.mutate()}
          />
          <Button
            accessibilityLabel={t("drill.cancelA11y", "Hủy xác nhận diễn tập")}
            disabled={drillMutation.isPending}
            label={t("common.back", "Quay lại")}
            onPress={() => setArmed(false)}
            variant="secondary"
          />
        </Card>
      )}

      {drillMutation.error ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {errorMessage(drillMutation.error, locale)}{" "}
            {t(
              "drill.notConfirmed",
              "Không hiển thị hoàn tất khi máy chủ chưa xác nhận source drill.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "drill.checkA11y",
              "Kiểm tra trạng thái diễn tập",
            )}
            label={t("sos.checkStatus", "Kiểm tra trạng thái")}
            onPress={refresh}
            variant="secondary"
          />
        </Card>
      ) : null}

      <Button
        accessibilityLabel={t("drill.closeA11y", "Đóng diễn tập mà không gửi")}
        disabled={drillMutation.isPending}
        label={t("drill.close", "Hủy — không gửi diễn tập")}
        onPress={() => router.back()}
        variant="secondary"
      />
    </Screen>
  );
};

export default function DrillScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <DrillContent session={session} />;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", gap: spacing.xs },
  heroIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
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
  infoText: { ...typography.bodyMedium, color: colors.textPrimary },
  warningCard: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warning,
  },
  warningText: { ...typography.bodyMedium, color: colors.warning },
  confirmCard: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  confirmTitle: { ...typography.headingMedium, color: colors.primary },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: { ...typography.bodyMedium, color: colors.danger },
});
