import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { colors } from "@/theme";

export type AppIconName = ComponentProps<typeof MaterialIcons>["name"];

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  accessibilityLabel?: string;
};

export const AppIcon = ({
  name,
  size = 24,
  color = colors.textPrimary,
  accessibilityLabel,
}: AppIconProps) => (
  <MaterialIcons
    accessible={Boolean(accessibilityLabel)}
    accessibilityLabel={accessibilityLabel}
    importantForAccessibility={
      accessibilityLabel ? "auto" : "no-hide-descendants"
    }
    name={name}
    size={size}
    color={color}
  />
);
