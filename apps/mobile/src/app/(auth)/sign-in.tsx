import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import {
  AppIcon,
  Badge,
  Button,
  Card,
  GoogleIcon,
  Input,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import { LanguageSwitcher } from "@/features/i18n/LanguageSwitcher";
import { translate, useI18n } from "@/features/i18n/I18nProvider";
import { colors, spacing, typography } from "@/theme";

const formSchema = z.object({
  email: z.email(
    translate("auth.invalidEmail", "Hãy nhập một địa chỉ email hợp lệ."),
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignInScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const auth = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (auth.session && !auth.loading) router.replace("/");
  }, [auth.loading, auth.session, router]);

  const emailMutation = useMutation({
    mutationFn: ({ email }: FormValues) => auth.signInWithEmail(email.trim()),
    onSuccess: (result) => {
      if (result.status === "link-sent") setSentTo(result.email);
      else router.replace("/");
    },
  });
  const googleMutation = useMutation({
    mutationFn: auth.signInWithGoogle,
    onSuccess: () => router.replace("/"),
  });

  if (sentTo) {
    return (
      <Screen>
        <LanguageSwitcher />
        <View style={styles.heroIcon}>
          <AppIcon color={colors.primary} name="mark-email-read" size={40} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t("auth.checkEmail", "Kiểm tra email của bạn")}
        </Text>
        <Text style={styles.description}>
          {t(
            "auth.linkSent",
            "Mình đã gửi liên kết đăng nhập tới {email}. Hãy mở liên kết trên thiết bị này để tiếp tục.",
            { email: sentTo },
          )}
        </Text>
        <Button
          accessibilityLabel={t(
            "auth.useAnotherEmailA11y",
            "Dùng địa chỉ email khác",
          )}
          label={t("auth.useAnotherEmail", "Dùng email khác")}
          onPress={() => setSentTo(null)}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <LanguageSwitcher />
      {env.dataMode === "fixture" ? (
        <Badge
          label={t("auth.fixtureBadge", "Dữ liệu mẫu chỉ trên thiết bị này")}
          variant="warning"
        />
      ) : null}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("auth.welcome", "Chào mừng bạn")}
        </Text>
        <Text style={styles.description}>
          Đăng nhập không cần mật khẩu bằng Google hoặc liên kết gửi qua email.
        </Text>
      </View>

      <Button
        accessibilityLabel={t("auth.continueGoogle", "Tiếp tục bằng Google")}
        label="Tiếp tục bằng Google"
        leadingIcon={<GoogleIcon />}
        loading={googleMutation.isPending}
        onPress={() => googleMutation.mutate()}
        variant="secondary"
      />

      <View
        accessible
        accessibilityLabel={t("auth.or", "hoặc")}
        style={styles.dividerRow}
      >
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{t("auth.or", "hoặc")}</Text>
        <View style={styles.divider} />
      </View>

      <Card>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel={t("auth.emailAddress", "Địa chỉ email")}
              autoCapitalize="none"
              autoComplete="email"
              error={fieldState.error?.message}
              keyboardType="email-address"
              label={t("auth.email", "Email")}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="ban@example.com"
              testID="sign-in-email-input"
              value={field.value}
            />
          )}
        />
        <Button
          accessibilityLabel={t("auth.continueEmail", "Tiếp tục bằng email")}
          label="Tiếp tục bằng email"
          loading={emailMutation.isPending}
          onPress={handleSubmit((values) => emailMutation.mutate(values))}
          testID="sign-in-email-button"
        />
      </Card>

      {auth.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {auth.error}
        </Text>
      ) : null}
      <Text style={styles.terms}>
        {t(
          "auth.terms",
          "Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của I’m Okay.",
        )}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  heading: { gap: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.bodyMedium, color: colors.danger },
  terms: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
