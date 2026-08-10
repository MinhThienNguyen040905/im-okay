import { StyleSheet, Text } from "react-native";

import { Card } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";

export const SettingsErrorCard = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <Card style={styles.card}>
      <Text accessibilityLiveRegion="assertive" style={styles.text}>
        {message}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  text: {
    ...typography.bodyMedium,
    color: colors.danger,
    paddingVertical: spacing.xs,
  },
});
