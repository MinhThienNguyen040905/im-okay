import { Stack } from "expo-router";

import { useI18n } from "@/features/i18n/I18nProvider";
import { colors } from "@/theme";

export default function AuthLayout() {
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
        name="sign-in"
        options={{ title: t("nav.signIn", "Đăng nhập") }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{
          headerShown: false,
          title: t("nav.confirmSignIn", "Xác nhận đăng nhập"),
        }}
      />
    </Stack>
  );
}
