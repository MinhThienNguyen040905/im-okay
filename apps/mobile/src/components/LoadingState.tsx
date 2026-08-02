import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label = "Đang tải…" }: LoadingStateProps) => (
  <View
    accessible
    accessibilityLabel={label}
    accessibilityRole="progressbar"
    accessibilityState={{ busy: true }}
    style={styles.container}
  >
    <ActivityIndicator color={colors.primary} size="large" />
    <Text style={styles.label}>{label}</Text>
  </View>
);

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
