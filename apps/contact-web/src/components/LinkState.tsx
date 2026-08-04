import { Text, View } from "react-native";

import { webStyles } from "./Shell";
import type { LinkStatus } from "@/publicApi";

const copy: Record<LinkStatus, { body: string; title: string }> = {
  accepted: {
    title: "Đã chấp nhận lời mời",
    body: "Lời mời đã được ghi nhận. Bạn có thể đóng trang này.",
  },
  active: {
    title: "Liên kết đang hoạt động",
    body: "Bạn có thể tiếp tục xử lý bên dưới.",
  },
  cancelled: {
    title: "Cảnh báo đã kết thúc",
    body: "Người dùng đã xác nhận an toàn. Bạn không cần làm gì thêm.",
  },
  declined: {
    title: "Đã từ chối lời mời",
    body: "Lựa chọn của bạn đã được ghi nhận.",
  },
  expired: {
    title: "Liên kết đã hết hạn",
    body: "Hãy nhờ người gửi tạo một liên kết mới.",
  },
  invalid: {
    title: "Liên kết không hợp lệ",
    body: "Liên kết có thể đã bị thay đổi. Đừng chia sẻ hoặc thử đoán token.",
  },
  pending: {
    title: "Lời mời đang chờ",
    body: "Hãy xem thông tin và chọn phản hồi bên dưới.",
  },
  resolved: {
    title: "Đã giải quyết",
    body: "Người cần được kiểm tra đã an toàn. Không còn hành động nào cần thực hiện.",
  },
  revoked: {
    title: "Liên kết đã bị thu hồi",
    body: "Người gửi đã hủy quyền sử dụng liên kết này.",
  },
  used: {
    title: "Liên kết đã được sử dụng",
    body: "Phản hồi trước đó đã được ghi nhận và không thể gửi lại.",
  },
};

export function LinkState({ status }: { status: LinkStatus }) {
  const value = copy[status];
  return (
    <View accessibilityRole="summary" style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={webStyles.title}>
        {value.title}
      </Text>
      <Text style={webStyles.body}>{value.body}</Text>
    </View>
  );
}
