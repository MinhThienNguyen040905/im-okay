import { StyleSheet, View } from "react-native";

import { Card } from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, radii, spacing } from "@/theme";

export const HomeSkeleton = () => {
  const { t } = useI18n();
  return (
    <View
      accessibilityLabel={t(
        "home.loadingStatus",
        "Đang tải trạng thái an toàn",
      )}
      style={styles.container}
    >
      <View style={[styles.line, styles.heading]} />
      <View style={[styles.line, styles.badge]} />
      <View style={[styles.line, styles.countdown]} />
      <View style={styles.circle} />
      <Card style={styles.cards}>
        <View style={styles.line} />
        <View style={styles.line} />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  line: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 18,
  },
  heading: { width: "62%" },
  badge: { alignSelf: "center", width: 140 },
  countdown: { alignSelf: "center", height: 38, width: 220 },
  circle: {
    alignSelf: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 184,
    width: 184,
  },
  cards: { gap: spacing.md },
});
