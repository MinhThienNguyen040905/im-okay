import { Stack } from "expo-router";
import { Alert, Pressable } from "react-native";

import { AppIcon } from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, sizes } from "@/theme";

export default function ContactsLayout() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: t("common.back", "Quay lại"),
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("contacts.title", "Liên hệ tin cậy"),
          headerRight: () => (
            <Pressable
              accessibilityLabel={t(
                "contacts.infoA11y",
                "Thông tin về liên hệ tin cậy",
              )}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                Alert.alert(
                  t("contacts.title", "Liên hệ tin cậy"),
                  t(
                    "contacts.infoBody",
                    "Chỉ những người đã chấp nhận lời mời mới được tính là sẵn sàng nhận cảnh báo.",
                  ),
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
      <Stack.Screen
        name="add"
        options={{ title: t("contacts.addTitle", "Thêm liên hệ") }}
      />
    </Stack>
  );
}
