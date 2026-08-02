import { StyleSheet, Text } from "react-native";

import { Badge, Card, Input, Screen } from "@/components";
import { colors, spacing, typography } from "@/theme";

export default function SignInShellScreen() {
  return (
    <Screen>
      <Badge label="MA1 · Navigation shell" />
      <Text accessibilityRole="header" style={styles.title}>
        Đăng nhập
      </Text>
      <Text style={styles.description}>
        Luồng đăng nhập email và Google sẽ được kết nối với Supabase Auth ở MA2.
      </Text>
      <Card accessibilityLabel="Bản xem trước biểu mẫu đăng nhập">
        <Input
          accessibilityLabel="Địa chỉ email"
          autoCapitalize="none"
          editable={false}
          keyboardType="email-address"
          label="Email"
          placeholder="ban@example.com"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
