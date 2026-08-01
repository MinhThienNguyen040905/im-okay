# M12 — Cài đặt

Tạo màn hình settings có thể cuộn, nhóm action theo mức độ rủi ro.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Quản lý kế hoạch, notification, diễn tập, privacy và account mà không vô tình tắt bảo vệ.

**PAGE STRUCTURE:**

1. Header “Cài đặt”.
2. Profile row: avatar, Minh Anh, email.
3. Section “Kế hoạch an toàn”:
   - Chu kỳ điểm danh — 36 giờ.
   - Liên hệ tin cậy — 2/3 đã sẵn sàng.
   - Tạm dừng bảo vệ — Đang tắt.
4. Section “Thông báo”:
   - Push notification — Đã bật.
   - Email của tôi — current email.
5. Section “Kiểm tra hệ thống”:
   - Diễn tập cảnh báo.
   - Kiểm tra quyền thiết bị.
6. Section “Quyền riêng tư và hỗ trợ”:
   - Dữ liệu của tôi.
   - Chính sách quyền riêng tư.
   - Trợ giúp.
7. Separated account actions: “Đăng xuất” và “Tắt kế hoạch an toàn”.
8. Version `I’m Okay 0.1.0`.
9. Bottom navigation: Trang chủ, Lịch sử, Cài đặt active.

**INTERACTIONS:** Snooze/tạm dừng luôn cần end time; disable safety plan yêu cầu re-authentication và confirmation; drill phải được gắn nhãn xuyên suốt.

**CONSTRAINTS:** Không hiển thị SMS, voice hoặc payment trong MVP. Dùng mobile component language của M06.

