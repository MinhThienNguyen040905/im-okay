import { Alert, StyleSheet, Text } from "react-native";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  LoadingState,
  Screen,
} from "@/components";
import { colors, spacing, typography } from "@/theme";

export const componentPreviewCases = {
  badges: ["success", "warning", "danger", "neutral"] as const,
  buttons: ["primary", "secondary", "danger"] as const,
};

/**
 * Development fixture for checking shared states without copying them into routes.
 * Import this component into a temporary local route when doing visual QA.
 */
export const ComponentPreview = () => (
  <Screen>
    <Text accessibilityRole="header" style={styles.title}>
      Shared component preview
    </Text>

    <Card accessibilityLabel="Các trạng thái badge">
      {componentPreviewCases.badges.map((variant) => (
        <Badge key={variant} label={variant} variant={variant} />
      ))}
    </Card>

    <Card accessibilityLabel="Các trạng thái button">
      {componentPreviewCases.buttons.map((variant) => (
        <Button
          key={variant}
          accessibilityLabel={`Nút ${variant}`}
          label={`Button ${variant}`}
          onPress={() => Alert.alert("Preview only")}
          variant={variant}
        />
      ))}
      <Button accessibilityLabel="Nút đang tải" label="Đang lưu" loading />
      <Button accessibilityLabel="Nút bị tắt" disabled label="Không khả dụng" />
    </Card>

    <Input label="Tên hiển thị" placeholder="Nhập tên" />
    <Input
      error="Vui lòng kiểm tra lại"
      label="Email có lỗi"
      value="email-khong-hop-le"
    />
    <LoadingState />
    <ErrorState message="Không thể kết nối. Chưa có dữ liệu nào được thay đổi." />
  </Screen>
);

const styles = StyleSheet.create({
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
