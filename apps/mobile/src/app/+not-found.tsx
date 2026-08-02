import { useRouter } from "expo-router";

import { Button, ErrorState, Screen } from "@/components";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen scrollable={false}>
      <ErrorState
        title="Không tìm thấy màn hình"
        message="Liên kết này không còn hợp lệ hoặc màn hình đã được chuyển."
      />
      <Button
        accessibilityLabel="Quay về trang chủ"
        label="Về trang chủ"
        onPress={() => router.replace("/(main)")}
      />
    </Screen>
  );
}
