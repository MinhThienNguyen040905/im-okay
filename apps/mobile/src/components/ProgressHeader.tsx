import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme";

type ProgressHeaderProps = {
  current: number;
  total: number;
  label: string;
};

export const ProgressHeader = ({
  current,
  total,
  label,
}: ProgressHeaderProps) => (
  <View
    accessibilityLabel={`Bước ${current} trên ${total}: ${label}`}
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 1, max: total, now: current }}
    style={styles.container}
  >
    <View style={styles.copyRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.count}>
        {current}/{total}
      </Text>
    </View>
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${(current / total) * 100}%` }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  copyRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { ...typography.label, color: colors.primary },
  count: { ...typography.caption, color: colors.textSecondary },
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 6,
    overflow: "hidden",
  },
  fill: { backgroundColor: colors.primary, height: "100%" },
});
