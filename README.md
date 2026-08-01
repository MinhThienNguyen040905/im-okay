# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận mình vẫn an toàn; nếu quá hạn, hệ thống sẽ nhắc người dùng và thông báo cho các liên hệ tin cậy.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị y tế.

## Trạng thái dự án

Dự án đang ở giai đoạn xác định sản phẩm và thiết kế giao diện bằng Google Stitch.

Tài liệu hiện có:

- Project brief và UX flows.
- Design system theo định dạng `DESIGN.md`.
- 12 prompt màn hình mobile.
- 5 prompt responsive web cho người thân.
- Prompt variants, targeted edits, prototype và accessibility QA.
- Project-specific Codex skill.

## Bắt đầu thiết kế

Đọc [`design/stitch/00-HUONG-DAN.md`](design/stitch/00-HUONG-DAN.md), sau đó:

1. Tạo một project Stitch duy nhất.
2. Đưa project brief và UX flows lên canvas.
3. Import `design/stitch/DESIGN.md`.
4. Thiết kế ba anchor screens.
5. Tạo variants, chọn hướng và tiếp tục theo từng user flow.

## Công nghệ dự kiến

- Expo + React Native + TypeScript.
- NestJS API và worker.
- PostgreSQL/Supabase.
- Redis/BullMQ.
- Expo Push Notifications.
- Gmail SMTP trong MVP.

