import { useRouter } from "expo-router";

import { Button, ErrorState, Screen } from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function UnexpectedLinkScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen scrollable={false}>
      <ErrorState
        message={t(
          "link.unsupportedMessage",
          "App chỉ nhận liên kết đăng nhập của chính I’m Okay. Liên kết dành cho người thân cần được mở trên trang web từ email.",
        )}
        title={t("link.unsupported", "Liên kết không được hỗ trợ")}
      />
      <Button
        accessibilityLabel={t(
          "link.discardAndOpen",
          "Bỏ liên kết không được hỗ trợ và mở I’m Okay",
        )}
        label={t("link.openApp", "Mở I’m Okay")}
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
