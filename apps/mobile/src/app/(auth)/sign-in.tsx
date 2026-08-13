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
import { colors, spacing, typography } from "@/theme";

const formSchema = z.object({
  email: z.email("Hãy nhập một địa chỉ email hợp lệ."),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignInScreen() {
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
        <View style={styles.heroIcon}>
          <AppIcon color={colors.primary} name="mark-email-read" size={40} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Kiểm tra email của bạn
        </Text>
        <Text style={styles.description}>
          Mình đã gửi liên kết đăng nhập tới {sentTo}. Hãy mở liên kết trên
          thiết bị này để tiếp tục.
        </Text>
        <Button
          accessibilityLabel="Dùng địa chỉ email khác"
          label="Dùng email khác"
          onPress={() => setSentTo(null)}
          variant="secondary"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {env.dataMode === "fixture" ? (
        <Badge label="Dữ liệu mẫu chỉ trên thiết bị này" variant="warning" />
      ) : null}
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Chào mừng bạn
        </Text>
        <Text style={styles.description}>
          Đăng nhập không cần mật khẩu bằng Google hoặc liên kết gửi qua email.
        </Text>
      </View>

      <Button
        accessibilityLabel="Tiếp tục bằng Google"
        label="Tiếp tục bằng Google"
        leadingIcon={<GoogleIcon />}
        loading={googleMutation.isPending}
        onPress={() => googleMutation.mutate()}
        variant="secondary"
      />

      <View accessible accessibilityLabel="hoặc" style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>hoặc</Text>
        <View style={styles.divider} />
      </View>

      <Card>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel="Địa chỉ email"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldState.error?.message}
              keyboardType="email-address"
              label="Email"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="ban@example.com"
              testID="sign-in-email-input"
              value={field.value}
            />
          )}
        />
        <Button
          accessibilityLabel="Tiếp tục bằng email"
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
        Khi tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền
        riêng tư của I’m Okay.
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
