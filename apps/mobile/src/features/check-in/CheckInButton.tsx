import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { AppIcon } from "@/components";
import { useAccessibilityPreferences } from "@/features/accessibility/AccessibilityProvider";
import { colors, radii, spacing, typography } from "@/theme";

type CheckInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export const CheckInButton = ({
  disabled = false,
  loading = false,
  onPress,
}: CheckInButtonProps) => {
  const isDisabled = disabled || loading;
  const { reduceMotionEnabled } = useAccessibilityPreferences();

  return (
    <Pressable
      accessibilityHint="Gửi xác nhận tới máy chủ và chờ phản hồi"
      accessibilityLabel={loading ? "Đang ghi nhận xác nhận" : "Tôi vẫn ổn"}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ring,
        pressed && !isDisabled && !reduceMotionEnabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      testID="check-in-button"
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} size="large" />
      ) : (
        <AppIcon
          color={colors.onPrimary}
          name="check-circle-outline"
          size={48}
        />
      )}
      <Text style={styles.label}>
        {loading ? "Đang ghi nhận…" : "Tôi vẫn ổn"}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primaryContainer,
    borderRadius: radii.pill,
    borderWidth: 8,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 184,
    minWidth: 184,
    maxWidth: "100%",
    padding: spacing.lg,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.6 },
  label: {
    ...typography.headingMedium,
    color: colors.onPrimary,
    textAlign: "center",
  },
});
