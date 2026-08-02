import { StyleSheet, Text, View } from "react-native";

import { colors, radii, typography } from "@/theme";

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  accessibilityLabel?: string;
};

const palettes = {
  success: { background: colors.successContainer, text: colors.success },
  warning: { background: colors.warningContainer, text: colors.warning },
  danger: { background: colors.dangerContainer, text: colors.danger },
  neutral: { background: colors.surfaceMuted, text: colors.secondary },
} as const;

export const Badge = ({
  label,
  variant = "neutral",
  accessibilityLabel,
}: BadgeProps) => {
  const palette = palettes[variant];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="text"
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    ...typography.caption,
  },
});
