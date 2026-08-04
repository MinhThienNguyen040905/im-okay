import { API_CONTRACT_VERSION } from "@im-okay/contracts";
import { StyleSheet, Text, View } from "react-native";

import { foundationStatus } from "@/status";

export default function FoundationStatusPage() {
  return (
    <View style={styles.page}>
      <View accessibilityRole="summary" style={styles.card}>
        <Text accessibilityRole="header" style={styles.eyebrow}>
          I’m Okay
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          Trang dành cho liên hệ tin cậy
        </Text>
        <Text style={styles.body}>{foundationStatus.message}</Text>
        <Text style={styles.meta}>
          Nền tảng {foundationStatus.stage} · API {API_CONTRACT_VERSION}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#334155",
    fontSize: 18,
    lineHeight: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe4ee",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    maxWidth: 640,
    padding: 32,
    width: "100%",
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: "#64748b",
    fontSize: 14,
  },
  page: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    flex: 1,
    justifyContent: "center",
    minHeight: "100%",
    padding: 24,
  },
  title: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
});
