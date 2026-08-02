import { useEffect } from "react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ErrorState, Screen } from "@/components";
import {
  AccessibilityProvider,
  useAccessibilityPreferences,
} from "@/features/accessibility/AccessibilityProvider";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/features/onboarding/OnboardingProvider";
import { getEntryRoute } from "@/features/onboarding/routing";
import { InboundLinkGuard } from "@/features/security/InboundLinkGuard";
import {
  captureException,
  initializeSentry,
  Sentry,
} from "@/lib/observability/sentry";
import { colors } from "@/theme";

initializeSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: { retry: 0 },
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export const ErrorBoundary = ({ error, retry }: ErrorBoundaryProps) => {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <SafeAreaProvider>
      <Screen scrollable={false}>
        <ErrorState
          title="Ứng dụng gặp sự cố"
          message="Dữ liệu an toàn trên máy chủ không bị thay đổi. Bạn có thể thử mở lại màn hình."
          onRetry={retry}
        />
      </Screen>
    </SafeAreaProvider>
  );
};

const RootNavigator = () => {
  const { session } = useAuth();
  const { draft, loading } = useOnboarding();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const protectedAccess =
    !loading && getEntryRoute(session, draft) === "/(main)";

  return (
    <>
      <StatusBar style="dark" />
      <InboundLinkGuard />
      <Stack
        screenOptions={{
          animation: reduceMotionEnabled ? "none" : "default",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="unexpected-link" options={{ headerShown: false }} />
        <Stack.Protected guard={protectedAccess}>
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="contacts" options={{ headerShown: false }} />
          <Stack.Screen name="warning" options={{ headerShown: false }} />
          <Stack.Screen name="sos" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="+not-found" options={{ title: "Không tìm thấy" }} />
      </Stack>
    </>
  );
};

const RootLayout = () => (
  <SafeAreaProvider>
    <AccessibilityProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OnboardingProvider>
            <RootNavigator />
          </OnboardingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AccessibilityProvider>
  </SafeAreaProvider>
);

export default Sentry.wrap(RootLayout);
