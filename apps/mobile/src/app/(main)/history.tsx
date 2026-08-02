import { StyleSheet, Text } from "react-native";

import { Card, Screen } from "@/components";
import { colors, typography } from "@/theme";

export default function HistoryShellScreen() {
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Lịch sử
      </Text>
      <Card muted>
        <Text style={styles.body}>
          Lịch sử check-in và cảnh báo sẽ được triển khai ở MA6.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
});
