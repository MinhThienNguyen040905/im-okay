# M11 — Lịch sử

Tạo màn hình activity history cho người dùng app.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Kiểm tra hệ thống đã ghi nhận check-in, reminder, alert và contact response như thế nào.

**PAGE STRUCTURE:**

1. Header “Lịch sử” và Filter action.
2. Segmented control: Tất cả active, Điểm danh, Cảnh báo.
3. Summary “7 ngày gần đây · 6 lần xác nhận đúng hạn”.
4. Timeline theo ngày:
   - Hôm nay, 20:15, “Đã xác nhận an toàn”; “Thời hạn mới: 08:15, 03/08/2026”.
   - Hôm nay, 18:15, “Đã gửi lời nhắc”; “Push notification”.
   - Hôm qua, 08:10, “Đã tạm hoãn 4 giờ”.
   - 29/07/2026, “Diễn tập cảnh báo”; “Lan đã xác nhận nhận email”.
5. Mỗi timeline item có icon, wording, timestamp và affordance xem chi tiết.
6. Bottom navigation: Trang chủ, Lịch sử active, Cài đặt.

**STATES:** Filter sheet, empty result, loading và failure dùng cùng content area.

**CONSTRAINTS:** Phân biệt drill bằng text/badge, không chỉ màu. Không hiển thị token hoặc nội dung email đầy đủ. Dùng mobile component language của M06.
