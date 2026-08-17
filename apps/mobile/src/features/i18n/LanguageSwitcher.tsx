import { Button } from "@/components";
import { useI18n } from "./I18nProvider";

export const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n();
  const nextLocale = locale === "vi" ? "en" : "vi";

  return (
    <Button
      accessibilityLabel={t(
        locale === "vi"
          ? "language.switchToEnglish"
          : "language.switchToVietnamese",
        locale === "vi" ? "Switch to English" : "Switch to Vietnamese",
      )}
      label={locale === "vi" ? "English" : "Tiếng Việt"}
      onPress={() => void setLocale(nextLocale)}
      variant="secondary"
    />
  );
};
