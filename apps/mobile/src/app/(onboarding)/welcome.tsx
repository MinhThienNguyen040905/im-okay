import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button, Card, Screen } from "@/components";
import { colors, typography } from "@/theme";

export default function WelcomeShellScreen() {
  const router = useRouter();

  return (
    <Screen
      footer={
        <Button
          accessibilityLabel="Tiếp tục đến màn hình đăng nhập"
          label="Tiếp tục"
          onPress={() => router.push("/sign-in")}
        />
      }
    >
      <Text accessibilityRole="header" style={styles.title}>
        Một lời xác nhận nhỏ, mỗi ngày
      </Text>
      <Text style={styles.description}>
        I’m Okay giúp bạn duy trì điểm danh an toàn và kết nối với người thân
        khi cần.
      </Text>
      <Card muted>
        <Text style={styles.notice}>
          Đây là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị
          y tế.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  notice: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
