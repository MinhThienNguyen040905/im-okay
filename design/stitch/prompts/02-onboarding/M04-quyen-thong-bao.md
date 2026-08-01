# M04 — Quyền push notification

Tạo pre-permission screen ở bước 2/3; không giả lập permission dialog của hệ điều hành.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Hiểu vì sao push notification hữu ích trước khi quyết định cấp quyền.

**PAGE STRUCTURE:**

1. App bar có Back, “Bước 2/3” và progress indicator.
2. Preview notification “Còn 4 giờ để xác nhận”.
3. Heading “Cho phép I’m Okay nhắc bạn”.
4. Copy “Thông báo giúp bạn điểm danh đúng hạn và giảm cảnh báo nhầm đến người thân.”
5. Ba capability rows:
   - “Nhắc trước thời hạn”.
   - “Cảnh báo khi sắp quá hạn”.
   - “Cập nhật khi người thân phản hồi”.
6. Limitation note “Điện thoại có thể chặn thông báo nếu bạn tắt quyền trong cài đặt hệ thống.”
7. Primary action “Cho phép thông báo”.
8. Secondary action “Để sau”.

**INTERACTIONS:** Primary mở native permission dialog; “Để sau” vẫn đi M05 nhưng M06 phải có configuration warning.

**CONSTRAINTS:** Không dùng dark pattern và không tuyên bố push luôn được giao. Dùng design system project.

