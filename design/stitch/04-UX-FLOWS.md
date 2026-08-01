# I’m Okay — UX flows tham khảo

File này dành cho người thiết kế kiểm tra prototype. Không cần upload riêng lên Stitch Web.

## Onboarding

```text
M01 Giới thiệu
  → M02 Đăng nhập
  → M03 Hồ sơ
  → M04 Quyền push
  → M05 Kế hoạch an toàn
  → M06 Trang chủ
```

## Check-in hằng ngày

```text
M06 Trang chủ
  → nhấn “Tôi vẫn ổn”
  → bottom sheet thành công
  → cập nhật deadline trên M06
```

Offline không được hiển thị thành công giả.

## Liên hệ tin cậy

```text
M06 Trang chủ
  → M07 Danh sách liên hệ
  → M08 Thêm liên hệ
  → gửi email
  → W01 Người thân chấp nhận
  → M07 chuyển “Đã xác nhận”
```

## Cảnh báo quá hạn

```text
M09 Sắp kích hoạt alert
  ├─ “Tôi vẫn ổn” → M06
  ├─ “Tạm hoãn” → bottom sheet có thời hạn
  └─ hết giờ → email → W02 → W03 → W04 → W05
```

## SOS

```text
M06 “Cần trợ giúp ngay”
  → M10 SOS
  → giữ 3 giây
  → email người thân
  → W02 → W03 → W04 → W05
```

MVP không tự gọi dịch vụ cấp cứu và không chia sẻ vị trí.

## Navigation mobile

- Bottom tabs: Trang chủ, Lịch sử, Cài đặt.
- M07–M10 là màn hình con, có thể bỏ bottom navigation.
- Check-in thành công dùng bottom sheet.
- Form validation dùng inline error.

## Navigation web

- Không có navigation marketing hoặc tài khoản.
- Web có kết thúc rõ: đã xử lý, chuyển tiếp, hết hạn hoặc không hợp lệ.
- Token trong URL không được hiển thị trong UI.

