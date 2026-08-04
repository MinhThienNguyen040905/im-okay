import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Shell } from "@/components/Shell";

export default function ContactWebHome() {
  return (
    <Shell>
      <View accessibilityRole="summary" style={styles.card}>
        <Text style={styles.eyebrow}>I’m Okay</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Trang dành cho liên hệ tin cậy
        </Text>
        <Text style={styles.body}>
          Hãy mở đúng liên kết trong email lời mời hoặc cảnh báo. Trang này
          không yêu cầu tài khoản.
        </Text>
        <Link accessibilityRole="link" href="/" style={styles.link}>
          Trợ giúp và quyền riêng tư
        </Link>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  body: { color: "#334155", fontSize: 18, lineHeight: 28 },
  card: { gap: 16 },
  eyebrow: { color: "#0f766e", fontSize: 16, fontWeight: "700" },
  link: { color: "#0f766e", fontSize: 16, fontWeight: "600", marginTop: 8 },
  title: { color: "#0f172a", fontSize: 32, fontWeight: "700", lineHeight: 40 },
});
