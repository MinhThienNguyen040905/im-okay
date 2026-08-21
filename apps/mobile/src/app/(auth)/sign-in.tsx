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
  GoogleIcon,
  Input,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import { LanguageSwitcher } from "@/features/i18n/LanguageSwitcher";
import {
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import { colors, radii, spacing, typography } from "@/theme";

const formSchema = (locale: AppLocale) =>
  z.object({
    email: z.email(
      translate(
        "auth.invalidEmail",
        "Hãy nhập một địa chỉ email hợp lệ.",
        {},
        locale,
      ),
    ),
  });

type FormValues = z.infer<ReturnType<typeof formSchema>>;

export default function SignInScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const auth = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(formSchema(locale)),
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
      <Screen contentStyle={styles.screenContent}>
        <BrandBar />
        <View style={styles.statusContent}>
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
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screenContent}>
      <BrandBar />
      {env.dataMode === "fixture" ? (
        <Badge
          label={t("auth.fixtureBadge", "Dữ liệu mẫu chỉ trên thiết bị này")}
          variant="warning"
        />
      ) : null}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("auth.welcomeBack", "Chào mừng bạn trở lại")}
        </Text>
        <Text style={styles.description}>
          {t("auth.description", "Đăng nhập an toàn, không cần mật khẩu.")}
        </Text>
      </View>

      <View style={styles.authFlow}>
        <Button
          accessibilityLabel={t("auth.continueGoogle", "Tiếp tục bằng Google")}
          label={t("auth.continueGoogle", "Tiếp tục bằng Google")}
          leadingIcon={<GoogleIcon />}
          loading={googleMutation.isPending}
          onPress={() => googleMutation.mutate()}
          variant="google"
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

        <View style={styles.emailSection}>
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
            accessibilityLabel={t("auth.sendLink", "Gửi liên kết đăng nhập")}
            label={t("auth.sendLink", "Gửi liên kết đăng nhập")}
            loading={emailMutation.isPending}
            onPress={handleSubmit((values) => emailMutation.mutate(values))}
            testID="sign-in-email-button"
          />
          <Text style={styles.helperText}>
            {t(
              "auth.emailHelper",
              "Chúng tôi sẽ gửi một liên kết đăng nhập an toàn đến email của bạn. Không cần mật khẩu.",
            )}
          </Text>
        </View>
      </View>

      {auth.error ? (
        <View
          accessible
          accessibilityLiveRegion="polite"
          style={styles.errorBanner}
        >
          <AppIcon color={colors.danger} name="error-outline" size={20} />
          <Text style={styles.error}>{auth.error}</Text>
        </View>
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

const BrandBar = () => (
  <View style={styles.brandBar}>
    <View style={styles.brandLockup}>
      <View style={styles.brandIcon}>
        <AppIcon color={colors.primary} name="shield" size={18} />
      </View>
      <Text style={styles.wordmark}>I&apos;m Okay</Text>
    </View>
    <LanguageSwitcher />
  </View>
);

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: 0,
  },
  brandBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  wordmark: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 16,
  },
  heroIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  statusContent: {
    gap: spacing.lg,
    marginTop: spacing.huge,
  },
  heading: {
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  authFlow: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerText: { ...typography.caption, color: colors.textSecondary },
  emailSection: {
    gap: spacing.sm,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorBanner: {
    alignItems: "flex-start",
    backgroundColor: colors.dangerContainer,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  error: {
    ...typography.bodyMedium,
    color: colors.danger,
    flex: 1,
  },
  terms: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: "auto",
    paddingTop: spacing.xxl,
  },
});
