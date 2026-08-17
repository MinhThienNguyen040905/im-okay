import { useRouter } from "expo-router";

import { Button, ErrorState, Screen } from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function NotFoundScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Screen scrollable={false}>
      <ErrorState
        title={t("link.screenNotFound", "Không tìm thấy màn hình")}
        message={t(
          "link.invalidScreen",
          "Liên kết này không còn hợp lệ hoặc màn hình đã được chuyển.",
        )}
      />
      <Button
        accessibilityLabel={t("link.returnHome", "Quay về trang chủ")}
        label={t("link.goHome", "Về trang chủ")}
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
