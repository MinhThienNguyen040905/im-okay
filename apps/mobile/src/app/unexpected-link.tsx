import { useRouter } from "expo-router";

import { Button, ErrorState, Screen } from "@/components";

export default function UnexpectedLinkScreen() {
  const router = useRouter();
  return (
    <Screen scrollable={false}>
      <ErrorState
        message="App chỉ nhận liên kết đăng nhập của chính I’m Okay. Liên kết dành cho người thân cần được mở trên trang web từ email."
        title="Liên kết không được hỗ trợ"
      />
      <Button
        accessibilityLabel="Bỏ liên kết không được hỗ trợ và mở I’m Okay"
        label="Mở I’m Okay"
        onPress={() => router.replace("/")}
      />
    </Screen>
  );
}
