import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Shell, webStyles } from "@/components/Shell";

const contactSteps = [
  "Chỉ mở liên kết được gửi trực tiếp cho bạn; không chuyển tiếp hoặc đăng công khai.",
  "Đọc tên người gửi và trạng thái hiển thị trước khi chọn hành động.",
  "Nếu bạn không thể hỗ trợ, hãy chọn đúng phương án để hệ thống chuyển sang liên hệ khác.",
  "Khi có nguy hiểm tức thời, hãy gọi số khẩn cấp tại nơi bạn đang ở và không chờ I’m Okay.",
];

export default function HelpPage() {
  return (
    <Shell showHelpLink={false}>
      <View accessibilityRole="summary" style={styles.content}>
        <Text style={webStyles.eyebrow}>TRỢ GIÚP VÀ AN TOÀN</Text>
        <Text accessibilityRole="header" aria-level={1} style={webStyles.title}>
          Dành cho liên hệ tin cậy
        </Text>
        <Text style={webStyles.body}>
          I’m Okay hỗ trợ người dùng duy trì check-in và liên lạc với những
          người họ tin tưởng. Trang này không yêu cầu tài khoản.
        </Text>

        <View accessibilityRole="summary" style={styles.notice}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={styles.sectionTitle}
          >
            Giới hạn quan trọng
          </Text>
          <Text style={webStyles.body}>
            I’m Okay không phải dịch vụ cứu hộ, tổng đài khẩn cấp hoặc thiết bị
            y tế. Hệ thống không tự gọi dịch vụ khẩn cấp, không chia sẻ vị trí
            và không bảo đảm mọi thông báo luôn đến đúng lúc.
          </Text>
        </View>

        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={styles.sectionTitle}
          >
            Khi bạn nhận được liên kết
          </Text>
          {contactSteps.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text
                accessibilityLabel={`Bước ${index + 1}`}
                style={styles.stepNumber}
              >
                {index + 1}
              </Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={styles.sectionTitle}
          >
            Quyền riêng tư của liên kết
          </Text>
          <Text style={webStyles.body}>
            Liên kết lời mời hoặc cảnh báo là liên kết riêng dành cho đúng người
            nhận. I’m Okay không yêu cầu mật khẩu, mã OTP, magic link đăng nhập
            hoặc thông tin thanh toán trên trang liên hệ.
          </Text>
        </View>

        <Link accessibilityRole="link" href="/" style={styles.backLink}>
          Quay lại trang dành cho liên hệ tin cậy
        </Link>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: "flex-start",
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "700",
    minHeight: 48,
    paddingVertical: 14,
  },
  content: { gap: 20 },
  notice: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  section: { gap: 12 },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 29,
  },
  step: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  stepNumber: {
    backgroundColor: "#ccfbf1",
    borderRadius: 18,
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 32,
    minHeight: 32,
    minWidth: 32,
    textAlign: "center",
  },
  stepText: {
    color: "#334155",
    flex: 1,
    fontSize: 17,
    lineHeight: 27,
  },
});
