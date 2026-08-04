import type { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export function Shell({ children }: PropsWithChildren) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>I’m Okay</Text>
          <Text style={styles.help}>Trợ giúp</Text>
        </View>
        <View style={styles.card}>{children}</View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Quyền riêng tư · Không chia sẻ liên kết này
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

type WebStyles = {
  body: TextStyle;
  button: ViewStyle;
  buttonDisabled: ViewStyle;
  buttonText: TextStyle;
  error: TextStyle;
  eyebrow: TextStyle;
  field: ViewStyle;
  label: TextStyle;
  secondaryButton: ViewStyle;
  secondaryText: TextStyle;
  title: TextStyle;
};

export const webStyles: WebStyles = {
  body: { color: "#334155", fontSize: 17, lineHeight: 27 },
  button: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  error: { color: "#b91c1c", fontSize: 16, lineHeight: 24 },
  eyebrow: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  field: { gap: 8 },
  label: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#0f766e",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondaryText: { color: "#0f766e", fontSize: 17, fontWeight: "700" },
  title: { color: "#0f172a", fontSize: 30, fontWeight: "700", lineHeight: 38 },
};

const styles = StyleSheet.create({
  brand: { color: "#0f766e", fontSize: 20, fontWeight: "800" },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 24,
    borderWidth: 1,
    gap: 20,
    padding: 24,
    width: "100%",
  },
  container: { gap: 16, maxWidth: 720, width: "100%" },
  footer: { alignItems: "center", padding: 16 },
  footerText: { color: "#64748b", fontSize: 13 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  help: { color: "#475569", fontSize: 15 },
  page: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    flexGrow: 1,
    minHeight: "100%",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
});
