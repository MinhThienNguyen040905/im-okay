# I’m Okay — UX flows và navigation

## Flow A — Onboarding

```text
M01 Giới thiệu
  → M02 Đăng nhập/email magic link
  → M03 Hồ sơ
  → M04 Quyền push
  → M05 Kế hoạch an toàn
  → M06 Trang chủ
```

Cho phép quay lại mà không mất dữ liệu. Nếu bỏ qua quyền push, vẫn hoàn tất onboarding nhưng M06 phải hiển thị nhắc cấu hình.

## Flow B — Check-in hằng ngày

```text
M06 Trang chủ
  → nhấn “Tôi vẫn ổn”
  → bottom sheet xác nhận thành công
  → cập nhật deadline trên M06
```

Offline không được hiển thị thành công giả. Loading, retry và lỗi thuộc state variants của M06.

## Flow C — Liên hệ tin cậy

```text
M06 Trang chủ
  → M07 Danh sách liên hệ
  → M08 Thêm liên hệ
  → gửi email
  → W01 Người thân chấp nhận lời mời
  → M07 chuyển trạng thái “Đã xác nhận”
```

Liên hệ chưa chấp nhận không được tính là đang hoạt động.

## Flow D — Cảnh báo quá hạn

```text
M09 Cảnh báo sắp kích hoạt
  ├─ “Tôi vẫn ổn” → M06
  ├─ “Tạm hoãn” → bottom sheet có thời hạn
  └─ hết giờ → gửi email
                → W02 Chi tiết cảnh báo
                → W03 Chọn hành động
                → W04 Theo dõi xử lý
                → W05 Kết quả
```

Nếu người dùng check-in sau khi email đã gửi, W05 thông báo người dùng đã tự xác nhận; không xóa lịch sử.

## Flow E — SOS

```text
M06 “Cần trợ giúp ngay”
  → M10 SOS
  → giữ 3 giây
  → trạng thái đang gửi
  → email người thân
  → W02 → W03 → W04 → W05
```

MVP không tự gọi dịch vụ cấp cứu và không chia sẻ vị trí.

## Flow F — Quản lý

```text
Bottom navigation
  ├─ M06 Trang chủ
  ├─ M11 Lịch sử
  └─ M12 Cài đặt
```

M07–M10 là màn hình con và không cần bottom navigation nếu task cần tập trung.

## Navigation toàn cục mobile

- Bottom tabs: `Trang chủ`, `Lịch sử`, `Cài đặt`.
- Nút quay lại có label accessibility.
- Không đặt SOS thành một bottom tab để tránh bấm nhầm.
- Check-in thành công dùng bottom sheet, không dùng màn hình riêng.
- Form validation dùng inline error, không chỉ dùng toast.

## Navigation web

- Không có navigation marketing hoặc tài khoản.
- Logo nhỏ và link trợ giúp/quyền riêng tư ở footer.
- Token trong URL xác định alert/contact; UI không hiển thị token.
- Trang phải có kết thúc rõ: đã xử lý, đã chuyển tiếp, hết hạn hoặc không hợp lệ.

