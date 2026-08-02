import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { AppIcon, type AppIconName } from "./AppIcon";

type FeatureRowProps = {
  icon: AppIconName;
  title: string;
  description: string;
};

export const FeatureRow = ({ icon, title, description }: FeatureRowProps) => (
  <View style={styles.row}>
    <View style={styles.icon}>
      <AppIcon color={colors.primary} name={icon} />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  icon: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  copy: { flex: 1, gap: spacing.xxs },
  title: { ...typography.label, color: colors.textPrimary },
  description: { ...typography.bodyMedium, color: colors.textSecondary },
});
