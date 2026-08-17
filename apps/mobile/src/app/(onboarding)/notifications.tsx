import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  FeatureRow,
  ProgressHeader,
  Screen,
} from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";
import { getPushPermission } from "@/features/notifications/push";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import type { PushDecision } from "@/features/onboarding/types";
import { colors, spacing, typography } from "@/theme";

export default function NotificationsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { requestPush, setPushDecision } = useOnboarding();
  const [permission, setPermission] = useState<PushDecision>("unasked");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void getPushPermission()
      .then(setPermission)
      .catch(() => undefined);
  }, []);

  const permissionMutation = useMutation({
    mutationFn: requestPush,
    onSuccess: (result) => {
      setPermission(result.decision);
      if (result.reason === "physical-device-required") {
        setNotice(
          t(
            "notifications.physicalDevice",
            "Cần thiết bị thật để lấy Expo push token. Bạn vẫn có thể tiếp tục.",
          ),
        );
      } else if (result.reason === "project-id-required") {
        setNotice(
          t(
            "notifications.projectId",
            "Quyền đã bật; token sẽ được đăng ký sau khi cấu hình EAS project ID.",
          ),
        );
      } else if (result.decision === "denied") {
        setNotice(
          t(
            "notifications.denied",
            "Không có push, bạn có thể bỏ lỡ lời nhắc điểm danh quan trọng.",
          ),
        );
      } else {
        router.replace("/safety-plan");
      }
    },
  });
  const laterMutation = useMutation({
    mutationFn: () =>
      setPushDecision(permission === "denied" ? "denied" : "skipped"),
    onSuccess: () => router.replace("/safety-plan"),
  });

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            accessibilityLabel={t("notifications.allow", "Cho phép thông báo")}
            label={
              permission === "granted"
                ? t("notifications.registerDevice", "Đăng ký thiết bị")
                : t("notifications.allow", "Cho phép thông báo")
            }
            loading={permissionMutation.isPending}
            onPress={() => permissionMutation.mutate()}
          />
          {permission === "denied" ? (
            <Button
              accessibilityLabel={t(
                "notifications.openSystemSettingsA11y",
                "Mở cài đặt thông báo của hệ thống",
              )}
              label={t(
                "notifications.openSystemSettings",
                "Mở cài đặt hệ thống",
              )}
              onPress={() => void Linking.openSettings()}
              variant="secondary"
            />
          ) : null}
          <Button
            accessibilityLabel={t(
              "notifications.laterA11y",
              "Để sau và tiếp tục",
            )}
            label={t("notifications.later", "Để sau")}
            loading={laterMutation.isPending}
            onPress={() => laterMutation.mutate()}
            testID="notifications-skip-button"
            variant="secondary"
          />
        </View>
      }
    >
      <ProgressHeader
        current={2}
        label={t("notifications.progress", "Thông báo an toàn")}
        total={3}
      />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("notifications.title", "Đừng bỏ lỡ lời nhắc điểm danh")}
        </Text>
        <Text style={styles.description}>
          {t(
            "notifications.description",
            "I’m Okay chỉ xin quyền sau khi giải thích. Bạn có thể tiếp tục ngay cả khi chưa bật push.",
          )}
        </Text>
      </View>

      <Card
        accessibilityLabel={t(
          "notifications.previewA11y",
          "Xem trước thông báo nhắc điểm danh",
        )}
      >
        <Badge
          label={t("notifications.previewBadge", "I’m Okay · Nhắc an toàn")}
          variant="success"
        />
        <Text style={styles.previewTitle}>
          {t("notifications.previewTitle", "Bạn ổn chứ?")}
        </Text>
        <Text style={styles.previewBody}>
          {t(
            "notifications.previewBody",
            "Hãy mở app để điểm danh trước khi thời hạn kết thúc.",
          )}
        </Text>
      </Card>

      <View style={styles.features}>
        <FeatureRow
          description={t(
            "notifications.featureDeadlineDescription",
            "Nhận lời nhắc trước khi kế hoạch hết hạn.",
          )}
          icon="schedule"
          title={t("notifications.featureDeadlineTitle", "Nhắc trước thời hạn")}
        />
        <FeatureRow
          description={t(
            "notifications.featureAlertDescription",
            "Biết khi trạng thái cần bạn chú ý.",
          )}
          icon="warning-amber"
          title={t("notifications.featureAlertTitle", "Cảnh báo rõ ràng")}
        />
        <FeatureRow
          description={t(
            "notifications.featureControlDescription",
            "Bạn có thể thay đổi quyền trong cài đặt hệ thống.",
          )}
          icon="tune"
          title={t("notifications.featureControlTitle", "Bạn luôn kiểm soát")}
        />
      </View>

      {notice ? (
        <Card muted>
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </Text>
        </Card>
      ) : null}
      {permissionMutation.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {t(
            "notifications.failed",
            "Không thể đăng ký push lúc này. Hãy kiểm tra kết nối hoặc chọn Để sau.",
          )}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  heading: { gap: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  previewTitle: { ...typography.headingMedium, color: colors.textPrimary },
  previewBody: { ...typography.bodyMedium, color: colors.textSecondary },
  features: { gap: spacing.lg },
  notice: { ...typography.bodyMedium, color: colors.textPrimary },
  error: { ...typography.bodyMedium, color: colors.danger },
});
