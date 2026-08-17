import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, spacing, typography } from "@/theme";

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label }: LoadingStateProps) => {
  const { t } = useI18n();
  const resolvedLabel = label ?? t("common.loading", "Đang tải…");

  return (
    <View
      accessible
      accessibilityLabel={resolvedLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>{resolvedLabel}</Text>
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
  label: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
});
