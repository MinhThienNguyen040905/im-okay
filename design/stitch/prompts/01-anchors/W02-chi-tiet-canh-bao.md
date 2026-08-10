# W02 — Chi tiết cảnh báo responsive web (anchor)

Tạo responsive web page chi tiết một cảnh báo thật mà Lan mở từ link email. Đây là anchor cho toàn bộ web experience của người thân.

**PLATFORM:** Responsive web, mobile-first 390 px; kiểm tra 768 px và 1440 px. Giữ task-focused content trong centered container, không biến desktop thành dashboard.

**USER CONTEXT:** Lan là liên hệ ưu tiên 1 của Minh Anh. Lan không có tài khoản và không cần cài app. Link đã được xác thực bằng token.

**USER GOAL:** Biết ai cần được kiểm tra, thời điểm nào và hành động tiếp theo là gì.

**PAGE STRUCTURE:**

1. Minimal header với logo I’m Okay và link Trợ giúp.
2. Status label “Cảnh báo an toàn” kết hợp icon và wording.
3. Heading “Minh Anh chưa xác nhận an toàn”.
4. Explanation “I’m Okay không nhận được xác nhận trước thời hạn. Hãy thử liên lạc với Minh Anh để kiểm tra.”
5. Alert details:
   - “Lần xác nhận gần nhất: 20:15, 01/08/2026”.
   - “Thời hạn: 08:15, 03/08/2026”.
   - “Quá hạn: 12 phút”.
   - “Bạn là: Liên hệ ưu tiên 1”.
6. Guidance “Không suy diễn rằng đã xảy ra sự cố. Trước tiên hãy gọi cho Minh Anh.”
7. Primary action “Tôi sẽ kiểm tra”.
8. Secondary action “Tôi không thể hỗ trợ lúc này”.
9. Footer có Alert reference `#A7K2`, thời điểm cập nhật, Privacy và Help.

**INTERACTIONS:**

- Primary action dẫn tới W03.
- Secondary action yêu cầu confirmation rồi chuyển cảnh báo cho liên hệ tiếp theo.
- Link hết hạn hoặc alert đã resolve phải thay toàn bộ action area bằng status phù hợp.

**CONSTRAINTS:** Dùng design system hiện có. Không hiển thị địa chỉ, map, health data, token hoặc danh sách đầy đủ liên hệ. Không thêm nút gọi dịch vụ cấp cứu trong MVP.
