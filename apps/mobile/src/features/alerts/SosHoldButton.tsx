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
  const [progress, setProgress] = useState(0);
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
    timerRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      const next = Math.min(1, (Date.now() - startedAt) / HOLD_DURATION_MS);
      setProgress(next);
      if (next >= 1) finish();
    }, TICK_MS);
  }, [disabled, finish, loading]);

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
        accessibilityHint="Giữ liên tục đủ ba giây. Thả tay trước thời gian sẽ hủy."
        accessibilityLabel="Giữ 3 giây để gửi SOS"
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        disabled={isDisabled}
        onPressIn={start}
        onPressOut={cancel}
        style={({ pressed }) => [
          styles.button,
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
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
              ? "Đang chờ máy chủ…"
              : progress > 0
                ? `Tiếp tục giữ · ${percentage}%`
                : "Giữ 3 giây để gửi SOS"}
          </Text>
        </View>
      </Pressable>
      <View
        accessibilityLabel={`Tiến trình giữ ${percentage}%`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percentage }}
      />
      <Text style={styles.instruction}>Thả tay để hủy</Text>
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
