import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, spacing, typography } from "@/theme";
import { AppIcon } from "./AppIcon";
import { Button } from "./Button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export const ErrorState = ({ title, message, onRetry }: ErrorStateProps) => {
  const { t } = useI18n();
  const resolvedTitle =
    title ?? t("common.unableToLoad", "Chưa thể tải nội dung");

  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <AppIcon
        accessibilityLabel={t("common.error", "Có lỗi")}
        color={colors.danger}
        name="error-outline"
        size={32}
      />
      <Text accessibilityRole="header" style={styles.title}>
        {resolvedTitle}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          accessibilityLabel={t("common.retryLoading", "Thử tải lại")}
          label={t("common.retry", "Thử lại")}
          onPress={onRetry}
          variant="secondary"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
