# M08 — Thêm liên hệ tin cậy

Tạo form thêm một trusted contact mới.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Nhập email của Lan, xác nhận consent và gửi lời mời.

**PAGE STRUCTURE:**

1. App bar có Back và title “Thêm liên hệ”.
2. Explanation “Người này sẽ nhận email khi bạn quá hạn và có thể xác nhận đang hỗ trợ.”
3. Input “Tên”, sample “Lan”.
4. Select “Mối quan hệ”, value “Bạn thân”.
5. Input “Email”, sample `lan.nguyen@example.com`.
6. Optional phone input có helper “Dành cho SMS trong phiên bản sau”; không thể hiện SMS đang hoạt động.
7. Select “Thứ tự ưu tiên”, value “1 — Liên hệ đầu tiên”.
8. Invitation explanation “Lan cần mở email và chấp nhận trước khi liên hệ được kích hoạt.”
9. Required checkbox “Tôi đã trao đổi và được người này đồng ý nhận cảnh báo.”
10. Primary action “Gửi lời mời”.

**STATES:** Inline email error; disabled submit; sending; sent thành công trở về M07 với trạng thái “Đang chờ”.

**CONSTRAINTS:** Không tuyên bố contact đã hoạt động ngay sau khi gửi email. Dùng design system project.

