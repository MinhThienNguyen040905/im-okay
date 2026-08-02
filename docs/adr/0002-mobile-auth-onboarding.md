# ADR 0002 — Auth và onboarding mobile MA2

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, M01–M05

## Bối cảnh

MA2 cần chạy được toàn bộ luồng người dùng mới trong khi NestJS API và các endpoint
`/me`, `/me/devices`, `/safety-plan` chưa được triển khai. App không được ghi trực tiếp
vào database domain, giả đồng bộ máy chủ hoặc tạo cảm giác đang được bảo vệ khi chỉ có
dữ liệu cục bộ.

## Quyết định

- Supabase Auth là adapter production cho email magic link và Google OAuth. Callback dùng
  deep link `imokay://auth/callback`; Supabase tiếp tục sở hữu refresh token và vòng đời
  phiên.
- Session Supabase được persist bằng SecureStore theo các chunk nhỏ trên native; web fallback
  dùng AsyncStorage. Client domain chỉ giữ access token cần cho API, không sao chép refresh
  token vào context.
- Root route khôi phục session và tiến trình onboarding trước khi chọn M01–M06. Tiến trình
  được lưu riêng theo user ID; giới thiệu được lưu ở cấp thiết bị.
- Profile và safety plan chỉ được đánh dấu hoàn tất sau khi adapter API trả thành công.
- `EXPO_PUBLIC_DATA_MODE=remote` gọi `/v1/me`, `/v1/me/devices` và `/v1/safety-plan`.
  Chế độ `fixture` chỉ được phép khi `EXPO_PUBLIC_APP_ENV=local`, lưu trên thiết bị và luôn
  hiển thị cảnh báo “chưa có bảo vệ thật”.
- M04 giải thích giá trị của push trước khi mở native permission prompt. Từ chối push không
  chặn tài khoản; app cho phép mở system settings. Android notification channel được tạo
  trước khi xin token.
- Expo push token cần thiết bị thật và EAS project ID. Token mới hoặc token bị rotate được
  gửi qua API; lỗi đăng ký được giữ ở trạng thái `pending` để thử lại, không hiển thị thành
  công giả.
- Mobile chỉ gửi lựa chọn chu kỳ 24/36/48 giờ. Deadline, thời điểm nhắc và escalation vẫn
  hoàn toàn do backend quyết định.
- M03 chỉ thu thập tên hiển thị và timezone IANA. Số điện thoại trong mockup cũ bị loại khỏi
  MVP vì SMS chưa dùng và nguyên tắc giảm PII.

## Hệ quả

- Có thể kiểm tra toàn bộ UX M01–M05 ngay ở local khi backend chưa có, nhưng fixture không
  phải bằng chứng nghiệm thu tích hợp.
- Nghiệm thu remote còn phụ thuộc BA2/BA3, cấu hình Supabase provider/redirect URL, EAS
  project ID, development build và thiết bị thật.
- Khi OpenAPI được sinh ở Plan 03, adapter viết tay phải được thay hoặc đối chiếu với typed
  generated client trước khi đóng release gate.
