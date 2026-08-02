import { forwardRef, useId, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { colors, radii, sizes, spacing, typography } from "@/theme";

type InputProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, onBlur, onFocus, style, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const nativeId = useId();
  const supportingText = error ?? helperText;

  return (
    <View style={styles.container}>
      <Text nativeID={`${nativeId}-label`} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityLabelledBy={`${nativeId}-label`}
        accessibilityHint={error ?? props.accessibilityHint}
        accessibilityState={{ disabled: props.editable === false }}
        allowFontScaling
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          style,
        ]}
      />
      {supportingText ? (
        <Text
          accessibilityLiveRegion={error ? "polite" : "none"}
          style={[styles.supporting, error && styles.error]}
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  input: {
    ...typography.bodyLarge,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: sizes.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.focus,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  supporting: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
  },
});
