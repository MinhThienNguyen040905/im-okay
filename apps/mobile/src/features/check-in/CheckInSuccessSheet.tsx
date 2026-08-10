import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon, Button } from "@/components";
import {
  modalAnimationForPreference,
  useAccessibilityPreferences,
} from "@/features/accessibility/AccessibilityProvider";
import { useAccessibilityFocus } from "@/features/accessibility/focus";
import { colors, radii, spacing, typography } from "@/theme";

import { formatCheckInOutcomeMessage } from "./presentation";
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
}: CheckInSuccessSheetProps) => {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const { focus, ref } = useAccessibilityFocus<Text>(
    "Máy chủ đã ghi nhận lần xác nhận an toàn.",
  );

  return (
    <Modal
      animationType={modalAnimationForPreference(reduceMotionEnabled)}
      onRequestClose={onClose}
      onShow={focus}
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.icon}>
              <AppIcon color={colors.success} name="verified" size={40} />
            </View>
            <Text
              accessible
              accessibilityRole="header"
              ref={ref}
              style={styles.title}
            >
              Máy chủ đã ghi nhận
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {formatCheckInOutcomeMessage(
                alertOutcome,
                `Lần xác nhận của bạn đã thành công. Thời hạn tiếp theo: ${nextDeadline}.`,
              )}
            </Text>
            <Button
              accessibilityLabel="Đóng thông báo xác nhận thành công"
              label="Đóng"
              onPress={onClose}
              testID="check-in-success-close"
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
    maxHeight: "90%",
  },
  scrollContent: {
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
