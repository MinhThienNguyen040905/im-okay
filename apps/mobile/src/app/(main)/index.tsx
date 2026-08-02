import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppIcon, Badge, Button, Card, Screen } from "@/components";
import { colors, spacing, typography } from "@/theme";

export default function HomeShellScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Chào bạn
          </Text>
          <Text style={styles.description}>Nền tảng ứng dụng đã sẵn sàng.</Text>
        </View>
        <AppIcon
          accessibilityLabel="Trạng thái an toàn"
          color={colors.success}
          name="verified"
        />
      </View>

      <Card accessibilityLabel="Trạng thái kế hoạch an toàn">
        <Badge label="Chưa kết nối máy chủ" variant="warning" />
        <Text style={styles.cardTitle}>Check-in sẽ được triển khai ở MA3</Text>
        <Text style={styles.cardBody}>
          App chưa tự tính hoặc thay đổi thời hạn. Deadline chính thức sẽ luôn
          đến từ API.
        </Text>
      </Card>

      <Button
        accessibilityLabel="Xem bản thử luồng onboarding"
        label="Xem onboarding shell"
        onPress={() => router.push("/welcome")}
        variant="secondary"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  cardBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
});
