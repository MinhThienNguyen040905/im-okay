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
import { useI18n } from "@/features/i18n/I18nProvider";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, spacing, typography } from "@/theme";

export default function SafetyPlanScreen() {
  const { t } = useI18n();
  const choices = [
    {
      hours: 24 as const,
      description: t("plan.choice24", "Nhịp kiểm tra hằng ngày"),
    },
    {
      hours: 36 as const,
      description: t("plan.choice36", "Cân bằng giữa an tâm và linh hoạt"),
    },
    {
      hours: 48 as const,
      description: t("plan.choice48", "Khoảng thời gian thư thả hơn"),
    },
  ];
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
          accessibilityLabel={t(
            "plan.createA11y",
            "Tạo kế hoạch an toàn {hours} giờ",
            { hours: selected },
          )}
          label={t("plan.create", "Tạo kế hoạch an toàn")}
          loading={mutation.isPending}
          onPress={() => mutation.mutate(selected)}
          testID="safety-plan-create-button"
        />
      }
    >
      <ProgressHeader
        current={3}
        label={t("nav.safetyPlan", "Kế hoạch an toàn")}
        total={3}
      />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("plan.title", "Bao lâu bạn muốn điểm danh một lần?")}
        </Text>
        <Text style={styles.description}>
          {t(
            "plan.description",
            "Chọn khoảng thời gian phù hợp với nhịp sống. Bạn có thể đổi lại sau.",
          )}
        </Text>
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {choices.map((choice) => (
          <OptionCard
            description={choice.description}
            key={choice.hours}
            label={t("plan.hours", "{hours} giờ", { hours: choice.hours })}
            onPress={() => setSelected(choice.hours)}
            selected={selected === choice.hours}
          />
        ))}
      </View>

      <Card muted>
        <Text style={styles.serverTitle}>
          {t("plan.serverTitle", "Thời hạn do máy chủ quản lý")}
        </Text>
        <Text style={styles.serverBody}>
          {t(
            "plan.serverBody",
            "Khoảng {hours} giờ được tính từ lần điểm danh thành công gần nhất. App sẽ hiển thị deadline chính thức từ API và không tự suy đoán thời gian cảnh báo.",
            { hours: selected },
          )}
        </Text>
      </Card>

      {env.dataMode === "fixture" ? (
        <Badge
          label={t(
            "plan.fixtureBadge",
            "Kế hoạch mẫu cục bộ — chưa đồng bộ máy chủ",
          )}
          variant="warning"
        />
      ) : null}
      {mutation.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {mutation.error instanceof Error
            ? mutation.error.message
            : t("plan.failed", "Không thể tạo kế hoạch an toàn.")}
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
