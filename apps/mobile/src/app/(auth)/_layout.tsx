import { Stack } from "expo-router";

import { colors } from "@/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="sign-in" options={{ title: "Đăng nhập" }} />
      <Stack.Screen
        name="auth/callback"
        options={{ headerShown: false, title: "Xác nhận đăng nhập" }}
      />
    </Stack>
  );
}
