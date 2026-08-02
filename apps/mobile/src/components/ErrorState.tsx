import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";
import { AppIcon } from "./AppIcon";
import { Button } from "./Button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export const ErrorState = ({
  title = "Chưa thể tải nội dung",
  message,
  onRetry,
}: ErrorStateProps) => (
  <View accessibilityLiveRegion="polite" style={styles.container}>
    <AppIcon
      accessibilityLabel="Có lỗi"
      color={colors.danger}
      name="error-outline"
      size={32}
    />
    <Text accessibilityRole="header" style={styles.title}>
      {title}
    </Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? (
      <Button
        accessibilityLabel="Thử tải lại"
        label="Thử lại"
        onPress={onRetry}
        variant="secondary"
      />
    ) : null}
  </View>
);

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
