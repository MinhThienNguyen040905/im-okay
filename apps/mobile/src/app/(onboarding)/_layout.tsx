import { Stack } from "expo-router";

import { useI18n } from "@/features/i18n/I18nProvider";
import { colors } from "@/theme";

export default function OnboardingLayout() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{ title: t("nav.getStarted", "Bắt đầu") }}
      />
      <Stack.Screen
        name="profile"
        options={{ title: t("nav.profile", "Hồ sơ") }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: t("nav.notifications", "Thông báo") }}
      />
      <Stack.Screen
        name="safety-plan"
        options={{ title: t("nav.safetyPlan", "Kế hoạch an toàn") }}
      />
    </Stack>
  );
}
