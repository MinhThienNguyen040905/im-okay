import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon, Button } from "@/components";
import { colors, radii, spacing, typography } from "@/theme";

import type { CheckInAlertOutcome } from "./types";

type CheckInSuccessSheetProps = {
  alertOutcome?: CheckInAlertOutcome | null;
  nextDeadline: string;
  onClose: () => void;
  visible: boolean;
};

export const CheckInSuccessSheet = ({
  alertOutcome,
  nextDeadline,
  onClose,
  visible,
}: CheckInSuccessSheetProps) => (
  <Modal
    animationType="slide"
    onRequestClose={onClose}
    transparent
    visible={visible}
  >
    <Pressable
      accessibilityLabel="Đóng xác nhận"
      onPress={onClose}
      style={styles.backdrop}
    >
      <Pressable
        accessibilityViewIsModal
        onPress={(event) => event.stopPropagation()}
        style={styles.sheet}
      >
        <View style={styles.icon}>
          <AppIcon color={colors.success} name="verified" size={40} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Máy chủ đã ghi nhận
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {alertOutcome?.result === "cancelled_before_notification"
            ? "Bạn đã xác nhận trước khi thông báo ra ngoài. Cảnh báo đã được máy chủ hủy."
            : alertOutcome?.result === "correction_queued"
              ? "Bạn đã xác nhận an toàn. Máy chủ đang xếp hàng gửi đính chính tới những liên hệ đã được báo."
              : alertOutcome?.result === "correction_sent"
                ? "Bạn đã xác nhận an toàn và máy chủ đã gửi đính chính tới các liên hệ."
                : `Lần xác nhận của bạn đã thành công. Thời hạn tiếp theo: ${nextDeadline}.`}
        </Text>
        <Button
          accessibilityLabel="Đóng thông báo xác nhận thành công"
          label="Đóng"
          onPress={onClose}
        />
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  icon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.successContainer,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  message: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
