import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing } from "@/theme";

type CardProps = PropsWithChildren<{
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export const Card = ({
  children,
  muted = false,
  style,
  accessibilityLabel,
}: CardProps) => (
  <View
    accessible={Boolean(accessibilityLabel)}
    accessibilityLabel={accessibilityLabel}
    style={[styles.base, muted && styles.muted, style]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.transparent,
    padding: spacing.md,
  },
});
