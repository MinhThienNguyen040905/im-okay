# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận mình vẫn an toàn; nếu quá hạn, hệ thống sẽ nhắc người dùng và thông báo cho các liên hệ tin cậy.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị y tế.

## Trạng thái dự án

Dự án đã hoàn tất phần client Mobile MA0–MA2. `apps/mobile` hiện có Expo SDK 57/Expo Router, Supabase email/Google auth adapter, secure session persistence, M01–M05, permission-first Expo Push, device registration adapter, safety-plan onboarding, resume progress, typed public env, shared UI và test foundation. Chế độ local fixture luôn cảnh báo chưa có bảo vệ thật; nghiệm thu remote MA2 còn phụ thuộc API BA2/BA3, cấu hình Supabase/EAS và thiết bị thật. Contact web, API, worker và CI của DI1 chưa scaffold.

Tài liệu hiện có:

- Project brief và UX flows.
- Design system theo định dạng `DESIGN.md`.
- 12 prompt màn hình mobile.
- 5 prompt responsive web cho người thân.
- Prompt variants, targeted edits, navigation contract và accessibility QA.
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

## Chạy mobile foundation

Yêu cầu Node.js theo `.nvmrc` và Corepack. Từ thư mục gốc:

```powershell
corepack enable
pnpm install
Copy-Item apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

Mặc định `.env.example` dùng `EXPO_PUBLIC_DATA_MODE=fixture` và chỉ chạy ở local.
Để nối hệ thống thật, đổi sang `remote` rồi cấu hình API URL, Supabase URL và Supabase
publishable key. Thêm redirect `imokay://**` trong Supabase Auth. Expo push token cần EAS
project ID, development build và thiết bị thật.

Các lệnh kiểm tra chính:

```powershell
pnpm --filter @im-okay/mobile lint
pnpm --filter @im-okay/mobile typecheck
pnpm --filter @im-okay/mobile test
pnpm --filter @im-okay/mobile build
```

Mọi biến `EXPO_PUBLIC_*` đều nằm trong app bundle và không được chứa secret. Sentry chỉ gửi sự cố khi cấu hình `EXPO_PUBLIC_SENTRY_DSN`.
