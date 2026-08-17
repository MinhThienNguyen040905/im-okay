import { useEffect } from "react";
import { useRouter } from "expo-router";

import { ErrorState, LoadingState, Screen } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { useI18n } from "@/features/i18n/I18nProvider";

export default function AuthCallbackScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { error, loading, session } = useAuth();

  useEffect(() => {
    if (session && !loading) router.replace("/");
  }, [loading, router, session]);

  if (error) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          message={error}
          onRetry={() => router.replace("/sign-in")}
          title={t("auth.confirmFailed", "Không thể xác nhận đăng nhập")}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <LoadingState
        label={t(
          "auth.confirming",
          "Đang xác nhận liên kết đăng nhập an toàn…",
        )}
      />
    </Screen>
  );
}
