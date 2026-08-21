import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";

import { AppIcon } from "@/components";
import { useAccessibilityPreferences } from "@/features/accessibility/AccessibilityProvider";
import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const HOLD_DURATION_MS = 3_000;
const TICK_MS = 50;

type SosHoldButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onComplete: () => void;
};

export const SosHoldButton = ({
  disabled = false,
  loading = false,
  onComplete,
}: SosHoldButtonProps) => {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startedAtRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    if (!completedRef.current) setProgress(0);
  }, [clearTimer]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimer();
    setProgress(1);
    Vibration.vibrate(60);
    onComplete();
    setTimeout(() => {
      completedRef.current = false;
      setProgress(0);
    }, 300);
  }, [clearTimer, onComplete]);

  const start = useCallback(() => {
    if (disabled || loading || timerRef.current) return;
    completedRef.current = false;
    startedAtRef.current = Date.now();
    setProgress(0);
    timerRef.current = setInterval(
      () => {
        const startedAt = startedAtRef.current;
        if (startedAt === null) return;
        const next = Math.min(1, (Date.now() - startedAt) / HOLD_DURATION_MS);
        setProgress(next);
        if (next >= 1) finish();
      },
      reduceMotionEnabled ? 250 : TICK_MS,
    );
  }, [disabled, finish, loading, reduceMotionEnabled]);

  useEffect(() => {
    if (disabled || loading) cancel();
  }, [cancel, disabled, loading]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancel();
    });
    return () => {
      subscription.remove();
      clearTimer();
    };
  }, [cancel, clearTimer]);

  const percentage = Math.round(progress * 100);
  const isDisabled = disabled || loading;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityHint={t(
          "sos.holdHint",
          "Giữ liên tục đủ ba giây. Thả tay trước thời gian sẽ hủy.",
        )}
        accessibilityLabel={t("sos.holdA11y", "Giữ 3 giây để gửi SOS")}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        disabled={isDisabled}
        onPressIn={start}
        onPressOut={cancel}
        style={({ pressed }) => [
          styles.button,
          isDisabled && styles.disabled,
          pressed && !isDisabled && !reduceMotionEnabled && styles.pressed,
        ]}
        testID="sos-hold-button"
      >
        <View
          accessibilityElementsHidden
          style={[styles.progressFill, { width: `${percentage}%` }]}
        />
        <View style={styles.content}>
          <AppIcon color={colors.onPrimary} name="touch-app" />
          <Text style={styles.label}>
            {loading
              ? t("home.pending", "Đang chờ máy chủ…")
              : progress > 0
                ? t("sos.holding", "Tiếp tục giữ · {percentage}%", {
                    percentage,
                  })
                : t("sos.holdA11y", "Giữ 3 giây để gửi SOS")}
          </Text>
        </View>
      </Pressable>
      <View
        accessibilityLabel={t(
          "sos.holdingProgressA11y",
          "Tiến trình giữ {percentage}%",
          { percentage },
        )}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percentage }}
      />
      <Text style={styles.instruction}>
        {t("sos.release", "Thả tay để hủy")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  button: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    minHeight: sizes.buttonDanger + spacing.sm,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFill: {
    backgroundColor: colors.dangerPressed,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  label: { ...typography.label, color: colors.onPrimary },
  instruction: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.99 }] },
});
