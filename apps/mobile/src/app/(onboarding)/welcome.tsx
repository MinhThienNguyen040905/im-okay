import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppIcon, Button, Card, FeatureRow, Screen } from "@/components";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, spacing, typography } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { completeIntro } = useOnboarding();
  const continueMutation = useMutation({
    mutationFn: completeIntro,
    onSuccess: () => router.replace("/sign-in"),
  });

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button
            accessibilityLabel="Bắt đầu thiết lập I’m Okay"
            label="Bắt đầu thiết lập"
            loading={continueMutation.isPending}
            onPress={() => continueMutation.mutate()}
          />
          <Button
            accessibilityLabel="Tôi đã có tài khoản"
            label="Tôi đã có tài khoản"
            onPress={() => continueMutation.mutate()}
            variant="secondary"
          />
        </View>
      }
    >
      <View style={styles.heroIcon}>
        <AppIcon color={colors.primary} name="verified-user" size={46} />
      </View>
      <View style={styles.heading}>
        <Text style={styles.wordmark}>I’M OKAY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Sống một mình, nhưng không đơn độc
        </Text>
        <Text style={styles.description}>
          Một lời xác nhận nhỏ mỗi ngày giúp người bạn tin tưởng biết khi nào
          cần liên hệ kiểm tra.
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureRow
          description="Chỉ một chạm để xác nhận bạn vẫn ổn."
          icon="touch-app"
          title="Điểm danh đơn giản"
        />
        <FeatureRow
          description="Nhắc bạn trước khi thời hạn kết thúc."
          icon="notifications-active"
          title="Nhắc đúng lúc"
        />
        <FeatureRow
          description="Liên hệ người thân khi bạn không phản hồi."
          icon="people"
          title="Kết nối vòng tròn tin cậy"
        />
      </View>

      <Card muted>
        <Text style={styles.notice}>
          I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ, thiết
          bị y tế hay hệ thống bảo đảm ứng cứu khẩn cấp.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  heroIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  heading: { alignItems: "center", gap: spacing.sm },
  wordmark: { ...typography.label, color: colors.primary, letterSpacing: 2 },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: "center",
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  features: { gap: spacing.lg },
  notice: { ...typography.bodyMedium, color: colors.textPrimary },
});
