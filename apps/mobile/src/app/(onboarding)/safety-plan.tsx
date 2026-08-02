import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  OptionCard,
  ProgressHeader,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, spacing, typography } from "@/theme";

const choices = [
  { hours: 24 as const, description: "Nhịp kiểm tra hằng ngày" },
  { hours: 36 as const, description: "Cân bằng giữa an tâm và linh hoạt" },
  { hours: 48 as const, description: "Khoảng thời gian thư thả hơn" },
];

export default function SafetyPlanScreen() {
  const router = useRouter();
  const { draft, saveSafetyPlan } = useOnboarding();
  const [selected, setSelected] = useState<24 | 36 | 48>(
    draft.intervalHours ?? 36,
  );
  const mutation = useMutation({
    mutationFn: saveSafetyPlan,
    onSuccess: () => router.replace("/"),
  });

  return (
    <Screen
      footer={
        <Button
          accessibilityLabel={`Tạo kế hoạch an toàn ${selected} giờ`}
          label="Tạo kế hoạch an toàn"
          loading={mutation.isPending}
          onPress={() => mutation.mutate(selected)}
          testID="safety-plan-create-button"
        />
      }
    >
      <ProgressHeader current={3} label="Kế hoạch an toàn" total={3} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Bao lâu bạn muốn điểm danh một lần?
        </Text>
        <Text style={styles.description}>
          Chọn khoảng thời gian phù hợp với nhịp sống. Bạn có thể đổi lại sau.
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {choices.map((choice) => (
          <OptionCard
            description={choice.description}
            key={choice.hours}
            label={`${choice.hours} giờ`}
            onPress={() => setSelected(choice.hours)}
            selected={selected === choice.hours}
          />
        ))}
      </View>

      <Card muted>
        <Text style={styles.serverTitle}>Thời hạn do máy chủ quản lý</Text>
        <Text style={styles.serverBody}>
          Khoảng {selected} giờ được tính từ lần điểm danh thành công gần nhất.
          App sẽ hiển thị deadline chính thức từ API và không tự suy đoán thời
          gian cảnh báo.
        </Text>
      </Card>

      {env.dataMode === "fixture" ? (
        <Badge
          label="Kế hoạch mẫu cục bộ — chưa đồng bộ máy chủ"
          variant="warning"
        />
      ) : null}
      {mutation.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Không thể tạo kế hoạch an toàn."}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  options: { gap: spacing.sm },
  serverTitle: { ...typography.label, color: colors.textPrimary },
  serverBody: { ...typography.bodyMedium, color: colors.textSecondary },
  error: { ...typography.bodyMedium, color: colors.danger },
});
