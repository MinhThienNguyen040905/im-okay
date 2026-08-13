# I’m Okay — thiết kế và UX

File này thay cho các hướng dẫn/prompt Stitch rời rạc trước đây. Thiết kế đã qua giai đoạn generate;
không cần tái chạy toàn bộ prompt. Khi sửa UI, lấy đúng selected screen từ project Stitch qua
`.stitch/metadata.json`, xem screenshot/HTML nếu có, rồi triển khai bằng component và token trong source.

## Sản phẩm

I’m Okay là ứng dụng safety check-in cho người sống một mình. Người dùng định kỳ nhấn “Tôi vẫn ổn”.
Nếu quá deadline, backend nhắc người dùng và cảnh báo trusted contact.

Đây là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ, thiết bị y tế hay hệ thống đảm bảo cứu mạng.
UI phải bình tĩnh, trung thực và không hứa quá khả năng hệ thống.

## Nguồn thiết kế

- Project Stitch: `I’m Okay Safety System`, ID `9249994988754984867`.
- Design system: asset `cbd4d1ec489847ac84e45f592436c1f3`.
- Screen ID, trạng thái và asset: `.stitch/metadata.json`.
- Token và quy tắc visual: `design/stitch/DESIGN.md`.
- Implementation thực tế: `apps/mobile/src` và `apps/contact-web/src`.

Nếu local Stitch snapshot lệch remote selected screen, ưu tiên remote screen và source đã test. HTML từ
Stitch chỉ là tham khảo hierarchy/spacing, không phải production code.

## Danh sách màn hình

| ID  | Màn hình              | Surface            |
| --- | --------------------- | ------------------ |
| M01 | Giới thiệu            | Mobile             |
| M02 | Đăng nhập             | Mobile             |
| M03 | Hồ sơ                 | Mobile             |
| M04 | Quyền thông báo       | Mobile             |
| M05 | Kế hoạch an toàn      | Mobile             |
| M06 | Trang chủ/check-in    | Mobile anchor      |
| M07 | Liên hệ tin cậy       | Mobile             |
| M08 | Thêm liên hệ email    | Mobile             |
| M09 | Cảnh báo              | Mobile anchor      |
| M10 | SOS/trợ giúp khẩn cấp | Mobile             |
| M11 | Lịch sử               | Mobile             |
| M12 | Cài đặt               | Mobile             |
| W01 | Xác nhận lời mời      | Contact web        |
| W02 | Chi tiết cảnh báo     | Contact web anchor |
| W03 | Chọn hành động        | Contact web        |
| W04 | Theo dõi xử lý        | Contact web        |
| W05 | Kết quả cảnh báo      | Contact web        |

Tất cả 17 màn đã có selected design. M08 trong Stitch có thể còn chi tiết phone/SMS cũ; MVP và source
hiện hành là **email-only**. M11/M12 có thể không xuất hiện trong list canvas nhưng truy cập được bằng
screen ID trong metadata.

## Luồng chính

```text
Onboarding: M01 → M02 → M03 → M04 → M05 → M06
Check-in:   M06 → server-confirmed success → deadline mới trên M06
Contact:    M06 → M07 → M08 → email → W01 → M07 accepted
Alert:      M09 → check-in/snooze hoặc W02 → W03 → W04 → W05
SOS:        M06 → M10 → giữ 3 giây/two-step → W02 → W03 → W04 → W05
```

Mobile bottom tabs chỉ có Trang chủ, Lịch sử và Cài đặt. M07–M10 là màn con. Contact web không có
marketing/account navigation và luôn có trạng thái kết thúc rõ ràng.

## Quy tắc UI quan trọng

- Trang chủ phải cho biết trạng thái, deadline và CTA check-in trong khoảng ba giây.
- Chỉ một primary CTA trên mỗi màn hình.
- Mobile tối ưu cho 390×844, padding ngang 20 px, safe area và font scaling.
- Touch target tối thiểu 48×48; focus rõ; màu luôn đi cùng icon và wording.
- Deep teal là primary, mint cho safe, amber cho warning, red chỉ dùng cho danger/SOS/destructive.
- Không lồng card quá mức, không dùng glassmorphism/neon/gradient trang trí.
- Tiếng Việt đúng dấu, câu ngắn, không đổ lỗi hoặc gây hoảng sợ.
- Hiển thị exact date/time gần countdown tương đối.
- Offline/timeout không được tạo false success.
- “Diễn tập” phải khác “Cảnh báo thật” bằng label, icon và màu.
- Public web không hiển thị raw token, địa chỉ, sức khỏe hay vị trí.

## State bắt buộc

- Loading, empty, disabled, offline, timeout và server error.
- Check-in submitting/success/failure mà không đổi deadline lạc quan.
- Push denied và push bị tắt sau onboarding.
- Session expired.
- Alert triggering, accepted-for-sending, partial channel failure, correction pending và cancelled.
- SOS hold-in-progress, accessible two-step và accepted-for-sending.
- Public token invalid, expired, already used và resolved.

## Quy trình sửa thiết kế

1. Tìm screen ID trong `.stitch/metadata.json` và tải selected screen hiện tại.
2. So sánh screenshot với source đang chạy ở viewport mục tiêu.
3. Dùng token từ `DESIGN.md`/theme code; không rải hex/radius trong screen.
4. Giữ invariant nghiệp vụ, loading/error/offline và accessibility.
5. Kiểm tra visual trên thiết bị hoặc browser; chạy test liên quan.
6. Chỉ cập nhật metadata khi selected Stitch screen thực sự thay đổi.

Không tạo lại bộ prompt theo từng màn hình. Khi cần một thiết kế mới, viết prompt trực tiếp từ tài liệu
này, `DESIGN.md`, contract hiện hành và màn hình nguồn liên quan.
