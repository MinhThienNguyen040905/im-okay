# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận mình vẫn an toàn; nếu quá hạn, hệ thống sẽ nhắc người dùng và thông báo cho các liên hệ tin cậy.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị y tế.

## Trạng thái dự án

Dự án đang ở cuối giai đoạn xác định sản phẩm/thiết kế và chuẩn bị scaffold source code. Stitch đã có 12 màn hình mobile app và 5 màn hình responsive web; prototype và QA accessibility/responsive vẫn cần hoàn tất trước khi export chính thức.

Tài liệu hiện có:

- Project brief và UX flows.
- Design system theo định dạng `DESIGN.md`.
- 12 prompt màn hình mobile.
- 5 prompt responsive web cho người thân.
- Prompt variants, targeted edits, prototype và accessibility QA.
- Project-specific Codex skill.
- [Master roadmap từ thiết kế đến production](docs/DEVELOPMENT-ROADMAP.md).
- Implementation plans: [Mobile](docs/plans/01-MOBILE-APP.md), [Contact web](docs/plans/02-CONTACT-WEB.md), [Backend API](docs/plans/03-BACKEND-API.md), [Worker/notifications](docs/plans/04-WORKER-NOTIFICATIONS.md), [Data/infra/DevOps](docs/plans/05-DATA-INFRA-DEVOPS.md) và [QA/security/release](docs/plans/06-QA-SECURITY-RELEASE.md).

## Bắt đầu thiết kế

Đọc [`design/stitch/00-BAT-DAU-O-DAY.md`](design/stitch/00-BAT-DAU-O-DAY.md), sau đó:

1. Tạo một project Stitch duy nhất.
2. Mở “Start with your design” và upload `design/stitch/DESIGN.md`.
3. Dán nội dung Additional instructions đã chuẩn bị sẵn.
4. Thiết kế ba anchor screens.
5. Tạo variants, chọn hướng và tiếp tục theo từng user flow.

## Công nghệ dự kiến

- Expo + React Native + TypeScript.
- NestJS API và worker.
- PostgreSQL/Supabase.
- Redis/BullMQ.
- Expo Push Notifications.
- Gmail SMTP trong MVP.
