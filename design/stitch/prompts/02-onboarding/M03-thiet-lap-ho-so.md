# M03 — Thiết lập hồ sơ

Tạo bước 1/3 của setup flow.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Nhập thông tin tối thiểu để người thân nhận diện Minh Anh trong alert.

**PAGE STRUCTURE:**

1. App bar có Back, “Bước 1/3” và progress indicator.
2. Heading “Bạn muốn được gọi là gì?”.
3. Copy “Tên này sẽ xuất hiện trong thông báo gửi đến người bạn tin tưởng.”
4. Avatar placeholder `M` và optional action “Thêm ảnh”.
5. Input “Tên hiển thị”, value “Minh Anh”.
6. Optional input “Số điện thoại”, prefix `+84`, helper “Không dùng để đăng nhập trong phiên bản này.”
7. Select “Múi giờ”, value “Asia/Ho_Chi_Minh (GMT+7)”.
8. Privacy message “Chúng tôi chỉ chia sẻ thông tin cần thiết khi cảnh báo được kích hoạt.”
9. Primary bottom action “Tiếp tục”.

**STATES:** Inline validation, keyboard-safe layout và giữ dữ liệu khi Back.

**CONSTRAINTS:** Không thêm địa chỉ, bệnh nền, ngày sinh hoặc giới tính. Dùng design system project.

