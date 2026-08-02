import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Badge, Button, Card, Screen } from "@/components";
import { useAuth } from "@/features/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { colors, typography } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { draft } = useOnboarding();
  const signOutMutation = useMutation({
    mutationFn: auth.signOut,
    onSuccess: () => router.replace("/"),
  });

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        Cài đặt
      </Text>
      <Card>
        <Text style={styles.label}>Tài khoản</Text>
        <Text style={styles.body}>{auth.session?.user.email}</Text>
        <Text style={styles.label}>Múi giờ</Text>
        <Text style={styles.body}>{draft.timezone}</Text>
        <Text style={styles.label}>Thông báo</Text>
        <Badge
          label={draft.pushDecision === "granted" ? "Đã cho phép" : "Chưa bật"}
          variant={draft.pushDecision === "granted" ? "success" : "warning"}
        />
      </Card>
      <Button
        accessibilityLabel="Đăng xuất khỏi I’m Okay"
        label="Đăng xuất"
        loading={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
        variant="secondary"
      />
      {signOutMutation.error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          Không thể đăng xuất. Vui lòng thử lại.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.headingLarge, color: colors.textPrimary },
  label: { ...typography.label, color: colors.textPrimary },
  body: { ...typography.bodyLarge, color: colors.textSecondary },
  error: { ...typography.bodyMedium, color: colors.danger },
});
