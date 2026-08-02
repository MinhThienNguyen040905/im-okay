import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radii, sizes, spacing, typography } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  accessibilityLabel: string;
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leadingIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variantStyles = {
  primary: {
    background: colors.primary,
    pressed: colors.primaryPressed,
    border: colors.primary,
    text: colors.onPrimary,
  },
  secondary: {
    background: colors.surface,
    pressed: colors.surfaceMuted,
    border: colors.border,
    text: colors.primary,
  },
  danger: {
    background: colors.danger,
    pressed: colors.dangerPressed,
    border: colors.danger,
    text: colors.onPrimary,
  },
} as const;

export const Button = ({
  accessibilityLabel,
  label,
  variant = "primary",
  loading = false,
  leadingIcon,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "danger" && styles.dangerHeight,
        {
          backgroundColor:
            pressed && !isDisabled ? palette.pressed : palette.background,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} accessibilityElementsHidden />
      ) : (
        leadingIcon
      )}
      <Text allowFontScaling style={[styles.label, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: sizes.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dangerHeight: {
    minHeight: sizes.buttonDanger,
  },
  label: {
    ...typography.label,
    textAlign: "center",
  },
});
