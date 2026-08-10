# M09 — Cảnh báo sắp kích hoạt (anchor)

Tạo một màn hình mobile full-screen cho trạng thái người dùng sắp quá hạn check-in. Đây là anchor cho toàn bộ warning và alert language của I’m Okay.

**PLATFORM:** Mobile, reference viewport 390 × 844 px.

**USER CONTEXT:** Minh Anh chưa xác nhận và còn 58 phút trước khi hệ thống gửi email cho Lan. Alert chưa được kích hoạt.

**USER GOAL:** Hiểu mức độ khẩn, hậu quả sắp xảy ra và nhanh chóng check-in hoặc snooze có thời hạn.

**PAGE STRUCTURE:**

1. Header tối giản với wordmark; không dùng bottom navigation.
2. Status indicator có icon và text “Sắp gửi cảnh báo”.
3. Heading “Bạn chưa xác nhận an toàn”.
4. Countdown lớn “00:58:42”, kèm “trước khi thông báo cho Lan”.
5. Information group:
   - “Hạn điểm danh: 08:15 hôm nay”.
   - “Liên hệ đầu tiên: Lan”.
   - “Kênh hiện tại: Email”.
6. Primary action “Tôi vẫn ổn”.
7. Secondary action “Tạm hoãn”.
8. Link “Xem tất cả liên hệ sẽ được báo”.
9. Explanation “Nếu bạn không phản hồi, I’m Okay sẽ bắt đầu quy trình cảnh báo tự động.”

**INTERACTIONS:**

- “Tôi vẫn ổn” hủy countdown và trở về M06 sau confirmation.
- “Tạm hoãn” mở bottom sheet có preset 1 giờ, 4 giờ và 8 giờ; không có snooze vô thời hạn.
- Countdown về 0 chuyển sang state “Đang gửi cảnh báo”; không cho snooze nhưng vẫn cho xác nhận an toàn.

**CONSTRAINTS:** Dùng design system hiện có. Đây là warning trước alert, không thiết kế như SOS và không dùng ngôn ngữ khẳng định đã có tai nạn.
