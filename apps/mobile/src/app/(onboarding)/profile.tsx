import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import {
  AppIcon,
  Button,
  Card,
  Input,
  ProgressHeader,
  Screen,
} from "@/components";
import {
  getLocaleTag,
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, spacing, typography } from "@/theme";

const detectedTimezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const isValidTimezone = (value: string, locale: AppLocale) => {
  try {
    new Intl.DateTimeFormat(getLocaleTag(locale), { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

const formSchema = (locale: AppLocale) =>
  z.object({
    displayName: z
      .string()
      .trim()
      .min(
        1,
        translate(
          "profile.nameRequired",
          "Hãy nhập tên bạn muốn hiển thị.",
          {},
          locale,
        ),
      )
      .max(
        80,
        translate(
          "profile.nameMax",
          "Tên hiển thị tối đa 80 ký tự.",
          {},
          locale,
        ),
      ),
    timezone: z
      .string()
      .trim()
      .refine(
        (value) => isValidTimezone(value, locale),
        translate(
          "profile.timezoneInvalid",
          "Múi giờ không hợp lệ, ví dụ Asia/Ho_Chi_Minh.",
          {},
          locale,
        ),
      ),
  });

type FormValues = z.infer<ReturnType<typeof formSchema>>;

export default function ProfileScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { draft, saveProfile } = useOnboarding();
  const { control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      displayName: draft.displayName ?? "",
      timezone: draft.timezone ?? detectedTimezone,
    },
    resolver: zodResolver(formSchema(locale)),
  });
  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => router.replace("/notifications"),
  });

  return (
    <Screen
      footer={
        <Button
          accessibilityLabel={t("profile.saveA11y", "Lưu hồ sơ và tiếp tục")}
          label={t("profile.save", "Lưu và tiếp tục")}
          loading={mutation.isPending}
          onPress={handleSubmit((values) => mutation.mutate(values))}
          testID="profile-save-button"
        />
      }
    >
      <ProgressHeader
        current={1}
        label={t("profile.progress", "Hồ sơ của bạn")}
        total={3}
      />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("profile.title", "Mình nên gọi bạn là gì?")}
        </Text>
        <Text style={styles.description}>
          {t(
            "profile.description",
            "Tên này giúp người thân nhận ra bạn trong lời mời và cảnh báo.",
          )}
        </Text>
      </View>

      <View style={styles.avatar}>
        <AppIcon color={colors.primary} name="person" size={42} />
      </View>

      <Card>
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <Input
              autoCapitalize="words"
              error={fieldState.error?.message}
              label={t("profile.displayName", "Tên hiển thị")}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder={t("profile.exampleName", "Ví dụ: Minh")}
              testID="profile-name-input"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="timezone"
          render={({ field, fieldState }) => (
            <Input
              autoCapitalize="none"
              error={fieldState.error?.message}
              helperText={t(
                "profile.timezoneHelp",
                "Dùng múi giờ IANA để lịch nhắc không bị lệch khi đi xa.",
              )}
              label={t("profile.timezone", "Múi giờ")}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Asia/Ho_Chi_Minh"
              value={field.value}
            />
          )}
        />
        <Button
          accessibilityLabel={t(
            "profile.detectedTimezoneA11y",
            "Dùng múi giờ phát hiện trên thiết bị: {timezone}",
            { timezone: detectedTimezone },
          )}
          label={t("profile.useTimezone", "Dùng {timezone}", {
            timezone: detectedTimezone,
          })}
          onPress={() =>
            setValue("timezone", detectedTimezone, { shouldValidate: true })
          }
          variant="secondary"
        />
      </Card>

      <Card muted>
        <Text style={styles.privacy}>
          {t(
            "profile.privacy",
            "Ở bước này I’m Okay chỉ cần tên hiển thị và múi giờ. App không yêu cầu địa chỉ, thông tin sức khỏe hay số điện thoại.",
          )}
        </Text>
      </Card>
      {mutation.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {t("profile.requestFailed", "Máy chủ chưa thể lưu hồ sơ.")}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.sm },
  title: { ...typography.display, color: colors.textPrimary },
  description: { ...typography.bodyLarge, color: colors.textSecondary },
  avatar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  privacy: { ...typography.bodyMedium, color: colors.textPrimary },
  error: { ...typography.bodyMedium, color: colors.danger },
});
