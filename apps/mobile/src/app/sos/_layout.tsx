import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { AppIcon } from "@/components";
import { colors, sizes } from "@/theme";

export default function SosLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => (
          <Pressable
            accessibilityLabel="Đóng mà không gửi cảnh báo"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={{
              alignItems: "center",
              height: sizes.minimumTouchTarget,
              justifyContent: "center",
              width: sizes.minimumTouchTarget,
            }}
          >
            <AppIcon color={colors.primary} name="close" />
          </Pressable>
        ),
        headerBackVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Trợ giúp khẩn cấp" }} />
      <Stack.Screen name="drill" options={{ title: "Diễn tập cảnh báo" }} />
    </Stack>
  );
}
