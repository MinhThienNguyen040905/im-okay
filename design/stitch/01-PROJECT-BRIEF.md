# I’m Okay — Project brief cho Stitch

## Sản phẩm

I’m Okay là ứng dụng safety check-in cho người sống một mình. Người dùng định kỳ nhấn “Tôi vẫn ổn”. Nếu họ không xác nhận trước deadline, backend nhắc người dùng và gửi cảnh báo cho các liên hệ tin cậy.

I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ, thiết bị y tế hoặc hệ thống bảo đảm cứu mạng.

## Người dùng

### Người dùng app

- Sống một mình hoặc thường xuyên ở một mình.
- Muốn thao tác check-in rất nhanh.
- Có thể không rành công nghệ.
- Cần hiểu trạng thái bảo vệ và deadline trong vài giây.

### Người thân trên web

- Mở link từ email hoặc SMS trên điện thoại.
- Không bắt buộc cài app hoặc đăng nhập.
- Cần biết ai đang quá hạn và mình nên làm gì.
- Có thể đang lo lắng, nên nội dung phải rõ và bình tĩnh.

## Giá trị cốt lõi

```text
Một lần xác nhận định kỳ.
Nếu bạn im lặng quá lâu, người bạn tin tưởng sẽ biết.
```

## MVP

- Mobile app Android/iOS.
- Đăng nhập Google hoặc email.
- Check-in 24, 36 hoặc 48 giờ.
- Push notification nhắc người dùng.
- Gmail gửi lời mời và cảnh báo.
- Tối đa ba liên hệ tin cậy.
- Web responsive để người thân phản hồi.
- SOS gửi ngay đến các liên hệ.
- Lịch sử và diễn tập cảnh báo.

Chưa hiển thị SMS, voice call, theo dõi vị trí liên tục, dữ liệu y tế, AI hoặc thanh toán.

## Ngôn ngữ và giọng điệu

- Dùng tiếng Việt tự nhiên, đúng dấu.
- Bình tĩnh, ấm áp, không phán xét.
- Không nói “Bạn đã thất bại điểm danh”. Dùng “Bạn chưa xác nhận an toàn”.
- Không suy diễn rằng người dùng chắc chắn gặp nguy hiểm.
- Phân biệt rõ cảnh báo thật và diễn tập.

## Dữ liệu mẫu nhất quán

- Người dùng: `Minh Anh`.
- Liên hệ: `Lan`, `Tuấn`, `Mẹ`.
- Lần xác nhận cuối: `20:15, 01/08/2026`.
- Deadline tiếp theo: `08:15, 03/08/2026`.
- Chu kỳ: `36 giờ`.
- Email mẫu: `lan.nguyen@example.com`.

## Platform

- Mobile reference viewport: 390 × 844 px.
- Web: mobile-first ở 390 px; kiểm tra 768 px và desktop 1440 px.
- Web alert content có maximum width khoảng 560–680 px; không biến thành dashboard desktop.

## Tiêu chí thành công UX

- Trang chủ cho biết trạng thái, thời gian còn lại và CTA check-in trong ba giây.
- Người thân hiểu hành động tiếp theo mà không cần đọc hướng dẫn dài.
- Không gửi SOS bằng một lần chạm vô tình.
- Không có snooze vô thời hạn.
- Màu không phải dấu hiệu trạng thái duy nhất.
- Không hiển thị dữ liệu nhạy cảm trên link công khai mặc định.

