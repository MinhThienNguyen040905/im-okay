import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, sizes, spacing, typography } from "@/theme";

import { AppIcon } from "./AppIcon";

type OptionCardProps = {
  description: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export const OptionCard = ({
  description,
  label,
  selected,
  onPress,
}: OptionCardProps) => (
  <Pressable
    accessibilityLabel={`${label}. ${description}`}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      selected && styles.selected,
      pressed && styles.pressed,
    ]}
  >
    <View style={styles.copy}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
    <AppIcon
      color={selected ? colors.primary : colors.border}
      name={selected ? "radio-button-checked" : "radio-button-unchecked"}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: sizes.buttonDanger,
    padding: spacing.md,
  },
  selected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  pressed: { opacity: 0.8 },
  copy: { flex: 1, gap: spacing.xxs },
  label: { ...typography.headingMedium, color: colors.textPrimary },
  description: { ...typography.bodyMedium, color: colors.textSecondary },
});
