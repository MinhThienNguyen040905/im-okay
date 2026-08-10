# M02 — Đăng nhập và đăng ký

Tạo màn hình authentication chung cho người mới và người quay lại.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Vào app nhanh bằng Google hoặc email, không cần password và SMS OTP.

**PAGE STRUCTURE:**

1. App bar có Back và wordmark nhỏ.
2. Heading “Chào bạn”.
3. Copy “Đăng nhập để duy trì kế hoạch an toàn của bạn trên mọi thiết bị.”
4. Button “Tiếp tục với Google” có Google icon đúng chuẩn.
5. Divider có label “hoặc”.
6. Persistent label input “Email”; sample `minhanh@gmail.com`.
7. Primary action “Tiếp tục bằng email”.
8. Helper “Chúng tôi sẽ gửi một liên kết đăng nhập đến email của bạn.”
9. Terms statement với link Điều khoản và Chính sách quyền riêng tư.

**STATES:** Invalid email dùng inline error; submit loading nằm trong button; button disabled khi email chưa hợp lệ.

**CONSTRAINTS:** Không thêm password, phone, Facebook hoặc Apple. Dùng design system project và giữ CTA nhìn thấy khi keyboard mở.
