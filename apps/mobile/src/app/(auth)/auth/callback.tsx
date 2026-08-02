import { useEffect } from "react";
import { useRouter } from "expo-router";

import { ErrorState, LoadingState, Screen } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";

export default function AuthCallbackScreen() {
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
          title="Không thể xác nhận đăng nhập"
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <LoadingState label="Đang xác nhận liên kết đăng nhập an toàn…" />
    </Screen>
  );
}
