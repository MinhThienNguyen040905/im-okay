# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận mình vẫn an toàn; nếu quá hạn, hệ thống sẽ nhắc người dùng và thông báo cho các liên hệ tin cậy.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị y tế.

## Trạng thái dự án

Dự án đã hoàn tất phần client Mobile MA0–MA6 và hardening MA7 có thể chứng minh
trong repository. `apps/mobile` hiện có Expo SDK 57/Expo Router, Supabase auth adapter và
M01–M12; reduced-motion/focus/dynamic-font hardening, incoming-link allowlist, Sentry PII scrub,
EAS profiles, Maestro fixture smoke, device matrix và release/rollback runbook đã có. Check-in,
trusted contacts, alert và settings vẫn tuân thủ projection/idempotency authoritative; app không tự
tính production deadline hay nhận public contact token. External acceptance MA2–MA7 còn phụ
thuộc Supabase backend/scheduler/contact web, staging, EAS/Sentry/store credential, test recipient đã
consent và thiết bị thật. Chưa có build/submit/deploy lên TestFlight hoặc Google Play.

S1 Foundation đã hoàn tất trong repository ngày 04/08/2026: `apps/contact-web`, package
contract v1, Supabase local config/migrations/RLS/seed, authenticated/public Edge routers,
Cron heartbeat, PGMQ notification queue, fake clock/providers và full-stack CI đã có. Local
database reset, 23 pgTAP test, auth/JWT/Edge smoke và client builds đều xanh. Nghiệp vụ
authoritative check-in/deadline/scheduler/reconciliation vẫn thuộc S2 và chưa được triển khai.

Kiến trúc MVP đã chốt Supabase-first ngày 04/08/2026: Supabase Auth + PostgreSQL/RLS,
Edge Functions, Cron và Queues thay cho kế hoạch NestJS/Prisma/Redis/BullMQ cũ. Quyết định
này không làm thay đổi phần mobile đã hoàn thành; xem
[`ADR 0008`](docs/adr/0008-supabase-first-backend.md).

Tài liệu hiện có:

- Project brief và UX flows.
- Design system theo định dạng `DESIGN.md`.
- 12 prompt màn hình mobile.
- 5 prompt responsive web cho người thân.
- Prompt variants, targeted edits, navigation contract và accessibility QA.
- Project-specific Codex skill.
- [Master roadmap từ thiết kế đến production](docs/DEVELOPMENT-ROADMAP.md).
- Ba plan đang dùng: [Mobile status/gates](docs/plans/01-MOBILE-APP.md),
  [Supabase MVP](docs/plans/02-SUPABASE-MVP.md) và
  [Quality/security/release](docs/plans/03-RELEASE.md).

## Bắt đầu thiết kế

Đọc [`design/stitch/00-BAT-DAU-O-DAY.md`](design/stitch/00-BAT-DAU-O-DAY.md), sau đó:

1. Tạo một project Stitch duy nhất.
2. Mở “Start with your design” và upload `design/stitch/DESIGN.md`.
3. Dán nội dung Additional instructions đã chuẩn bị sẵn.
4. Thiết kế ba anchor screens.
5. Tạo variants, chọn hướng và tiếp tục theo từng user flow.

## Công nghệ dự kiến

- Expo + React Native + TypeScript.
- Supabase Auth + PostgreSQL + RLS/RPC.
- Supabase Edge Functions cho HTTP API/provider orchestration.
- Supabase Cron + Queues cho scheduling, retry và reconciliation.
- Expo Push Notifications.
- Email HTTP provider qua adapter; Resend là mặc định MVP.

## Chạy mobile foundation

Yêu cầu Node.js theo `.nvmrc` và Corepack. Từ thư mục gốc:

```powershell
corepack enable
corepack pnpm install
Copy-Item apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile
```

Mặc định `.env.example` dùng `EXPO_PUBLIC_DATA_MODE=fixture` và chỉ chạy ở local.
Để nối hệ thống thật, đổi sang `remote` rồi cấu hình API URL trỏ tới Supabase
Edge Function router, Supabase URL và publishable key. Ví dụ base API URL là
`https://<project-ref>.supabase.co/functions/v1/api`; mobile tiếp tục nối các path `/v1/...`.
Thêm redirect `imokay://**` trong Supabase Auth. Expo push token cần EAS project ID,
development build và thiết bị thật.

Các lệnh kiểm tra chính:

```powershell
pnpm --filter @im-okay/mobile lint
pnpm --filter @im-okay/mobile typecheck
pnpm --filter @im-okay/mobile test
pnpm --filter @im-okay/mobile build
```

Mọi biến `EXPO_PUBLIC_*` đều nằm trong app bundle và không được chứa secret. Sentry chỉ gửi sự cố khi cấu hình `EXPO_PUBLIC_SENTRY_DSN`.

## Chạy Supabase Foundation local

Yêu cầu Docker Desktop đang chạy. Từ thư mục gốc:

```powershell
corepack pnpm install
npm run supabase:start
npm run test:integration
npm run dev:contact-web
```

Nếu Windows báo `EPERM` khi pnpm nhập native package từ `node_modules` cũ, dùng fallback
`npm install --workspaces --include-workspace-root --no-package-lock`; các lệnh `npm run` ở
trên không thay đổi.

Các endpoint health local:

- Public: `http://127.0.0.1:54321/functions/v1/public-api/v1/health`.
- Authenticated: `http://127.0.0.1:54321/functions/v1/api/v1/health`.

Seed local chỉ dùng danh tính giả `an@example.test` / `local-demo-password`. Email local được
giữ trong SMTP inbox local; fake push/email provider không gọi mạng. Các lệnh vận hành:

```powershell
npm run supabase:status
npm run test:db
npm run supabase:reset # Xóa và dựng lại toàn bộ database local
npm run supabase:stop
```

Parity gap của S1: Cron mới chạy heartbeat chứng minh scheduler; PGMQ mới có queue nền,
chưa có due-scan/consumer/reconciliation của S2. Google OAuth, Resend, Expo Push thật,
hosted secrets và staging không được mô phỏng thành công ở local.
