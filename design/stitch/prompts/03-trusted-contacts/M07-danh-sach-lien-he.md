# M07 — Danh sách liên hệ tin cậy

Tạo màn hình quản lý các liên hệ sẽ nhận alert.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Biết ai đang hoạt động, thứ tự ưu tiên và ai chưa chấp nhận lời mời.

**PAGE STRUCTURE:**

1. App bar có Back, title “Liên hệ tin cậy” và Info.
2. Explanation “Khi cảnh báo được kích hoạt, chúng tôi sẽ liên hệ theo thứ tự dưới đây.”
3. Summary “2/3 liên hệ đã sẵn sàng” và progress indicator.
4. Ordered contact list:
   - Lan, Bạn thân, `lan.nguyen@example.com`, “Đã xác nhận”, “Ưu tiên 1”.
   - Tuấn, Anh trai, email, “Đã xác nhận”, “Ưu tiên 2”.
   - Mẹ, email, “Đang chờ”, “Ưu tiên 3”, action “Gửi lại lời mời”.
5. Mỗi row có overflow menu cho Sửa/Xóa và affordance đổi thứ tự.
6. Secondary action “Thêm liên hệ”.
7. Guidance “Nên có ít nhất hai người đã xác nhận để tránh bỏ lỡ cảnh báo.”

**STATES:** Empty list, pending invitation, invalid email và reorder success phải dùng cùng layout.

**CONSTRAINTS:** Không dùng icon thùng rác làm action chính. Dùng design system và component language của M06.

