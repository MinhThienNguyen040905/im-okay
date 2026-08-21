import { Redirect } from "expo-router";

import { LoadingState, Screen } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { useI18n } from "@/features/i18n/I18nProvider";
import { getEntryRoute } from "@/features/onboarding/routing";

export default function IndexRoute() {
  const auth = useAuth();
  const onboarding = useOnboarding();
  const { t } = useI18n();

  if (auth.loading || onboarding.loading) {
    return (
      <Screen scrollable={false}>
        <LoadingState
          label={t("app.restoringSession", "Đang khôi phục phiên an toàn…")}
        />
      </Screen>
    );
  }

  return <Redirect href={getEntryRoute(auth.session, onboarding.draft)} />;
}
