import { StyleSheet, Text, View } from "react-native";

import { AppIcon, Badge, Button, Card, Screen } from "@/components";
import { useI18n } from "@/features/i18n/I18nProvider";
import { colors, radii, spacing, typography } from "@/theme";

import { deliveryStatusText } from "./presentation";
import type { AlertContextSnapshot, AlertSource } from "./types";

type AlertAcceptedStateProps = {
  onHome: () => void;
  onStatus: () => void;
  snapshot: AlertContextSnapshot;
  source: Extract<AlertSource, "sos" | "drill">;
};

export const AlertAcceptedState = ({
  onHome,
  onStatus,
  snapshot,
  source,
}: AlertAcceptedStateProps) => {
  const { locale, t } = useI18n();
  const alert = snapshot.projection.currentAlert;
  const isDrill = source === "drill";
  return (
    <Screen>
      {isDrill ? (
        <View style={styles.centered}>
          <Badge
            label={t("alerts.acceptedDrillBadge", "DIỄN TẬP · KHÔNG PHẢI SOS")}
            variant="neutral"
          />
        </View>
      ) : null}
      <View style={isDrill ? styles.drillIcon : styles.successIcon}>
        <AppIcon
          color={isDrill ? colors.primary : colors.success}
          name={isDrill ? "science" : "check-circle-outline"}
          size={48}
        />
      </View>
      <Text
        accessibilityLiveRegion="assertive"
        accessibilityRole="header"
        style={styles.title}
      >
        {isDrill
          ? t("alerts.acceptedDrillTitle", "Máy chủ đã tiếp nhận lượt diễn tập")
          : t(
              "alerts.acceptedSosTitle",
              "Máy chủ đã tiếp nhận yêu cầu trợ giúp",
            )}
      </Text>
      <Text style={styles.body}>
        {snapshot.projection.contactSummary.displayNames.length > 0
          ? t(
              "alerts.acceptedRecipients",
              "{label} đang được xử lý cho {names}.",
              {
                label: isDrill
                  ? t("alerts.acceptedDrillLabel", "Nhãn diễn tập")
                  : t("alerts.acceptedRequestLabel", "Yêu cầu"),
                names:
                  snapshot.projection.contactSummary.displayNames.join(", "),
              },
            )
          : t(
              "alerts.noEligibleContacts",
              "Chưa có liên hệ đủ điều kiện nhận thông báo.",
            )}
      </Text>
      <Card muted>
        <View style={styles.infoRow}>
          <AppIcon color={colors.textSecondary} name="info-outline" />
          <Text accessibilityLiveRegion="polite" style={styles.infoText}>
            {alert
              ? deliveryStatusText(alert.delivery.status, locale)
              : t(
                  "alerts.noProjection",
                  "Máy chủ chưa trả về alert projection.",
                )}
          </Text>
        </View>
      </Card>
      <Text style={styles.disclaimer}>
        {t(
          "alerts.acceptedDisclaimer",
          "I’m Okay không tự gọi dịch vụ cứu hộ và không chia sẻ vị trí. Trạng thái gửi không đồng nghĩa người thân đã đọc hoặc nhận xử lý.",
        )}
      </Text>
      <Button
        accessibilityLabel={t("warning.home", "Về Trang chủ")}
        label={t("warning.home", "Về Trang chủ")}
        onPress={onHome}
      />
      <Button
        accessibilityLabel={t(
          "alerts.viewStatusA11y",
          "Xem trạng thái cảnh báo",
        )}
        label={t("alerts.viewStatus", "Xem trạng thái cảnh báo")}
        onPress={onStatus}
        variant="secondary"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  centered: { alignItems: "center" },
  successIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.successContainer,
    borderRadius: radii.pill,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  drillIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  infoRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  infoText: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
