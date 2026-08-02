import { Stack } from "expo-router";
import { Alert, Pressable } from "react-native";

import { AppIcon } from "@/components";
import { colors, sizes } from "@/theme";

export default function ContactsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: "Quay lại",
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Liên hệ tin cậy",
          headerRight: () => (
            <Pressable
              accessibilityLabel="Thông tin về liên hệ tin cậy"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                Alert.alert(
                  "Liên hệ tin cậy",
                  "Chỉ những người đã chấp nhận lời mời mới được tính là sẵn sàng nhận cảnh báo.",
                )
              }
              style={{
                alignItems: "center",
                height: sizes.minimumTouchTarget,
                justifyContent: "center",
                width: sizes.minimumTouchTarget,
              }}
            >
              <AppIcon color={colors.primary} name="info-outline" />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="add" options={{ title: "Thêm liên hệ" }} />
    </Stack>
  );
}
