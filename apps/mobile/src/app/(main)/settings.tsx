import { StyleSheet, Text } from "react-native";

import { Card, Screen } from "@/components";
import { colors, typography } from "@/theme";

export default function SettingsShellScreen() {
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Cài đặt
      </Text>
      <Card muted>
        <Text style={styles.body}>
          Hồ sơ, múi giờ và trạng thái push sẽ được triển khai ở MA6.
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
