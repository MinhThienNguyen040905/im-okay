import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { AppIcon, Button } from "@/components";
import {
  modalAnimationForPreference,
  useAccessibilityPreferences,
} from "@/features/accessibility/AccessibilityProvider";
import { useAccessibilityFocus } from "@/features/accessibility/focus";
import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, radii, spacing, typography } from "@/theme";

import type { SnoozeDuration } from "./types";

type SnoozeSheetProps = {
  durations: SnoozeDuration[];
  error?: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (duration: SnoozeDuration) => void;
  visible: boolean;
};

export const SnoozeSheet = ({
  durations,
  error,
  loading,
  onClose,
  onSubmit,
  visible,
}: SnoozeSheetProps) => {
  const { t } = useI18n();
  const [selected, setSelected] = useState<SnoozeDuration | null>(null);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const { focus, ref } = useAccessibilityFocus<Text>(
    t("alerts.snoozeFocus", "Chọn thời gian tạm hoãn có thời hạn."),
  );

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal
      animationType={modalAnimationForPreference(reduceMotionEnabled)}
      onRequestClose={loading ? undefined : close}
      onShow={focus}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel={t(
          "alerts.closeSnoozeA11y",
          "Đóng lựa chọn tạm hoãn",
        )}
        disabled={loading}
        onPress={close}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={styles.sheet}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text
              accessible
              accessibilityRole="header"
              ref={ref}
              style={styles.title}
            >
              {t("alerts.snoozeTitle", "Tạm hoãn có thời hạn")}
            </Text>
            <Text style={styles.body}>
              {t(
                "alerts.snoozeBody",
                "Máy chủ sẽ trả về thời điểm kết thúc chính xác. Không có tùy chọn tạm hoãn vô thời hạn.",
              )}
            </Text>

            {durations.map((duration) => {
              const checked = selected === duration;
              return (
                <Pressable
                  accessibilityLabel={t(
                    "alerts.snoozeDurationA11y",
                    "Tạm hoãn {hours} giờ",
                    { hours: duration },
                  )}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, disabled: loading }}
                  disabled={loading}
                  key={duration}
                  onPress={() => setSelected(duration)}
                  style={({ pressed }) => [
                    styles.option,
                    checked && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppIcon
                    color={checked ? colors.primary : colors.textSecondary}
                    name={
                      checked
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                  />
                  <Text style={styles.optionLabel}>
                    {t("alerts.hours", "{hours} giờ", { hours: duration })}
                  </Text>
                </Pressable>
              );
            })}

            {error ? (
              <Text accessibilityLiveRegion="assertive" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button
              accessibilityLabel={t(
                "alerts.confirmSnoozeA11y",
                "Xác nhận tạm hoãn có thời hạn",
              )}
              disabled={!selected}
              label={t("alerts.confirmSnooze", "Xác nhận tạm hoãn")}
              loading={loading}
              onPress={() => {
                if (!selected) return;
                const duration = selected;
                setSelected(null);
                onSubmit(duration);
              }}
            />
            <Button
              accessibilityLabel={t("alerts.noSnoozeA11y", "Không tạm hoãn")}
              disabled={loading}
              label={t("common.cancel", "Hủy")}
              onPress={close}
              variant="secondary"
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
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  option: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  optionLabel: { ...typography.label, color: colors.textPrimary },
  error: { ...typography.bodyMedium, color: colors.danger },
  pressed: { opacity: 0.75 },
});
