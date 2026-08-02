import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Redirect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon, Button, Card, Input, Screen } from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import { createTrustedContactsApi } from "@/features/trusted-contacts/api";
import {
  addTrustedContactSchema,
  type AddTrustedContactForm,
} from "@/features/trusted-contacts/form";
import { trustedContactsQueryKey } from "@/features/trusted-contacts/query";
import { TrustedContactsApiError } from "@/features/trusted-contacts/types";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const AddContactContent = ({ session }: { session: AuthSession }) => {
  const api = useMemo(() => createTrustedContactsApi(session), [session]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<AddTrustedContactForm>({
    defaultValues: { displayName: "", email: "", consentConfirmed: false },
    mode: "onChange",
    resolver: zodResolver(addTrustedContactSchema),
  });

  const createMutation = useMutation({
    mutationFn: api.createContact,
    onSuccess: (snapshot) => {
      queryClient.setQueryData(
        trustedContactsQueryKey(session.user.id),
        snapshot,
      );
      router.back();
    },
    onError: (error) => {
      if (
        error instanceof TrustedContactsApiError &&
        error.code === "CONTACT_DUPLICATE"
      ) {
        setError("email", { type: "server", message: error.message });
      }
    },
  });

  const submit = handleSubmit((values) => {
    createMutation.reset();
    createMutation.mutate({
      displayName: values.displayName.trim(),
      email: values.email.trim(),
      consentConfirmed: true,
    });
  });

  const formError =
    createMutation.error instanceof TrustedContactsApiError
      ? createMutation.error
      : null;
  const showGeneralError = formError && formError.code !== "CONTACT_DUPLICATE";

  return (
    <Screen
      footer={
        <Button
          accessibilityLabel="Gửi lời mời liên hệ tin cậy"
          disabled={!isValid}
          label="Gửi lời mời"
          leadingIcon={<AppIcon color={colors.onPrimary} name="send" />}
          loading={createMutation.isPending}
          onPress={() => void submit()}
        />
      }
    >
      <Text style={styles.intro}>
        Người này sẽ nhận email khi bạn quá hạn và có thể xác nhận đang hỗ trợ.
      </Text>

      {env.dataMode === "fixture" ? (
        <Card muted>
          <Text style={styles.fixtureText}>
            Chế độ dữ liệu mẫu không gửi email thật.
          </Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="displayName"
        render={({ field: { onBlur, onChange, ref, value } }) => (
          <Input
            ref={ref}
            autoCapitalize="words"
            autoComplete="name"
            error={errors.displayName?.message}
            label="Tên"
            maxLength={80}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Lan"
            returnKeyType="next"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, ref, value } }) => (
          <Input
            ref={ref}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={errors.email?.message}
            inputMode="email"
            keyboardType="email-address"
            label="Email"
            onBlur={onBlur}
            onChangeText={(next) => {
              createMutation.reset();
              onChange(next);
            }}
            placeholder="lan.nguyen@example.com"
            returnKeyType="done"
            value={value}
          />
        )}
      />

      <Card muted>
        <View style={styles.noticeRow}>
          <AppIcon color={colors.primary} name="info-outline" />
          <Text style={styles.notice}>
            Liên hệ chỉ được tính là sẵn sàng sau khi họ mở email và tự chấp
            nhận lời mời.
          </Text>
        </View>
      </Card>

      <Controller
        control={control}
        name="consentConfirmed"
        render={({ field: { onChange, value } }) => (
          <View>
            <Pressable
              accessibilityLabel="Tôi đã trao đổi và được người này đồng ý nhận cảnh báo"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
              onPress={() => onChange(!value)}
              style={({ pressed }) => [
                styles.consentRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                {value ? (
                  <AppIcon color={colors.onPrimary} name="check" size={18} />
                ) : null}
              </View>
              <Text style={styles.consentText}>
                Tôi đã trao đổi và được người này đồng ý nhận cảnh báo.
              </Text>
            </Pressable>
            {errors.consentConfirmed?.message ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errors.consentConfirmed.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {showGeneralError ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {formError.message} Lời mời chưa được tạo.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
};

export default function AddContactScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <AddContactContent session={session} />;
}

const styles = StyleSheet.create({
  intro: { ...typography.bodyMedium, color: colors.textSecondary },
  fixtureText: { ...typography.bodyMedium, color: colors.warning },
  noticeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  notice: { ...typography.bodyMedium, color: colors.textSecondary, flex: 1 },
  consentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: sizes.minimumTouchTarget,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    marginTop: spacing.xxs,
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  pressed: { opacity: 0.75 },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
