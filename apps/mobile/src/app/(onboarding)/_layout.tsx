import { Stack } from "expo-router";

import { colors } from "@/theme";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="welcome" options={{ title: "Bắt đầu" }} />
      <Stack.Screen name="profile" options={{ title: "Hồ sơ" }} />
      <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
      <Stack.Screen
        name="safety-plan"
        options={{ title: "Kế hoạch an toàn" }}
      />
    </Stack>
  );
}
