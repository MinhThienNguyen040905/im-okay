import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { AppIcon, type AppIconName } from "@/components";
import { colors, sizes, typography } from "@/theme";

type TabIconProps = {
  color: ColorValue;
  size: number;
  focused: boolean;
};

const tabIcon = (active: AppIconName, inactive: AppIconName) =>
  function TabIcon({ color, size, focused }: TabIconProps) {
    return (
      <AppIcon color={color} name={focused ? active : inactive} size={size} />
    );
  };

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: typography.caption,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
        },
        tabBarItemStyle: { minHeight: sizes.minimumTouchTarget },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarAccessibilityLabel: "Mở Trang chủ",
          tabBarIcon: tabIcon("home", "home-filled"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Lịch sử",
          tabBarAccessibilityLabel: "Mở Lịch sử",
          tabBarIcon: tabIcon("history", "history"),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarAccessibilityLabel: "Mở Cài đặt",
          tabBarIcon: tabIcon("settings", "settings"),
        }}
      />
    </Tabs>
  );
}
