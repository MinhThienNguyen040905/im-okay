# M06 — Trang chủ mobile (anchor)

Tạo một màn hình Trang chủ high-fidelity cho ứng dụng safety check-in I’m Okay. Đây là màn hình neo xác định component language cho toàn bộ mobile app.

**PLATFORM:** Mobile, reference viewport 390 × 844 px.

**USER CONTEXT:** Minh Anh đã hoàn thành onboarding, chọn chu kỳ 36 giờ, có ba liên hệ và hiện vẫn trong thời gian an toàn.

**USER GOAL:** Trong ba giây, hiểu trạng thái bảo vệ, thời gian còn lại và cách xác nhận an toàn.

**PAGE STRUCTURE:**

1. Header có lời chào “Chào buổi tối, Minh Anh” và avatar.
2. Status indicator gồm icon và text “Đang được bảo vệ”.
3. Primary status area hiển thị:
   - Label “Thời gian còn lại”.
   - Countdown “35 giờ 42 phút”.
   - “Hạn tiếp theo: 08:15, 03/08/2026”.
4. Main check-in control với icon check và text “Tôi vẫn ổn”. Đây là CTA nổi bật duy nhất.
5. Metadata “Lần xác nhận gần nhất: 20:15, 01/08/2026”.
6. Hai secondary status items: “3 liên hệ” và “Thông báo đã bật”.
7. Secondary emergency action “Cần trợ giúp ngay”, kèm “Giữ 3 giây để gửi SOS”.
8. Bottom navigation: Trang chủ active, Lịch sử, Cài đặt.

**INTERACTIONS:**

- Tap check-in mở bottom sheet thành công và cập nhật deadline; không điều hướng sang page mới.
- SOS yêu cầu press-and-hold ba giây.
- Các status item có thể mở màn hình liên hệ hoặc cấu hình notification.

**IMPORTANT STATES TO SUPPORT LATER:** Sending, success, offline failure, push permission disabled and deadline approaching. Giữ chỗ hợp lý để state message không làm layout nhảy mạnh.

**CONSTRAINTS:** Dùng design system hiện có của project. Không tạo theme mới, không dùng medical imagery, không thêm tính năng ngoài brief và không đặt màn hình trong device mockup.
