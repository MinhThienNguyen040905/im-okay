import { useEffect } from "react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorState, Screen } from "@/components";
import {
  captureException,
  initializeSentry,
  Sentry,
} from "@/lib/observability/sentry";
import { colors } from "@/theme";

initializeSentry();

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

const RootLayout = () => (
  <SafeAreaProvider>
    <StatusBar style="dark" />
    <Stack
      screenOptions={{ contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: "Không tìm thấy" }} />
    </Stack>
  </SafeAreaProvider>
);

export default Sentry.wrap(RootLayout);
