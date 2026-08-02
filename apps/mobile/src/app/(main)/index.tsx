import { StyleSheet, Text, View } from "react-native";

import { AppIcon, Badge, Card, Screen } from "@/components";
import { env } from "@/config/env";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, spacing, typography } from "@/theme";

export default function HomeScreen() {
  const { draft } = useOnboarding();

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Chào {draft.displayName}
          </Text>
          <Text style={styles.description}>Kế hoạch ban đầu đã sẵn sàng.</Text>
        </View>
        <AppIcon
          accessibilityLabel="Đã hoàn tất onboarding"
          color={colors.success}
          name="verified"
        />
      </View>

      <Card accessibilityLabel="Kế hoạch điểm danh đã chọn">
        <Badge label={`${draft.intervalHours} giờ`} variant="success" />
        <Text style={styles.cardTitle}>Chu kỳ điểm danh</Text>
        <Text style={styles.cardBody}>
          Check-in thực tế sẽ được nối ở MA3. Deadline chính thức luôn phải đến
          từ API, không được app tự tính.
        </Text>
      </Card>

      {draft.pushDecision !== "granted" ? (
        <Card muted>
          <Text style={styles.warningTitle}>Push chưa hoạt động</Text>
          <Text style={styles.cardBody}>
            Bạn có thể bỏ lỡ lời nhắc. Hãy bật quyền trong cài đặt khi sẵn sàng.
          </Text>
        </Card>
      ) : null}

      {env.dataMode === "fixture" ? (
        <Badge
          label="Dữ liệu mẫu cục bộ · chưa có bảo vệ thật"
          variant="warning"
        />
      ) : null}
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
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  cardTitle: { ...typography.headingMedium, color: colors.textPrimary },
  warningTitle: { ...typography.label, color: colors.warning },
  cardBody: { ...typography.bodyMedium, color: colors.textSecondary },
});
