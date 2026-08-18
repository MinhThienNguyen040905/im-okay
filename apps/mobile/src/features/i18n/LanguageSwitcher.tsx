import { Pressable, StyleSheet, Text } from "react-native";

import { AppIcon } from "@/components";
import { colors, radii, sizes, spacing, typography } from "@/theme";
import { useI18n } from "./I18nProvider";

export const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n();
  const nextLocale = locale === "vi" ? "en" : "vi";

  return (
    <Pressable
      accessibilityLabel={t(
        locale === "vi"
          ? "language.switchToEnglish"
          : "language.switchToVietnamese",
        locale === "vi" ? "Switch to English" : "Switch to Vietnamese",
      )}
      accessibilityRole="button"
      onPress={() => void setLocale(nextLocale)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID="language-switcher"
    >
      <AppIcon color={colors.textSecondary} name="language" size={18} />
      <Text style={styles.label}>{nextLocale.toUpperCase()}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: sizes.minimumTouchTarget,
    minWidth: sizes.minimumTouchTarget,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.border,
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
