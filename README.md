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

S1–S2 đã hoàn tất trong local/integration ngày 04/08/2026. `apps/contact-web`, contract v1,
Supabase migrations/RLS/seed và authenticated/public Edge routers đã có; profile/timezone IANA,
device token, safety plan, authoritative check-in/deadline, Cron batch, outbox/PGMQ lease,
stale-job check và reconciliation đều chạy bằng backend thật. Database reset từ trống, 74 pgTAP
test, Edge/local auth smoke, concurrent idempotent check-in, 109 mobile test và client builds đều
xanh. S3 contacts/alerts/contact web và push/email provider là bước tiếp theo.
Invariant cycle, policy 24/36/48 và recovery được ghi tại
[`ADR 0009`](docs/adr/0009-core-check-in-cycle-scheduling.md).

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

## Chạy Supabase MVP local

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

S2 thêm các authenticated route `/v1/me`, `/v1/me/devices`, `/v1/safety-plan`,
`/v1/safety-plan/status`, `/v1/safety-plan/disable` và `/v1/check-ins`. Tất cả mutation domain
đi qua Edge + internal RPC; mobile không nhận service-role key.

Để chạy mobile remote qua điện thoại Android đang cắm USB:

```powershell
adb reverse tcp:54321 tcp:54321
npm run supabase:status
```

Sau đó đặt `EXPO_PUBLIC_DATA_MODE=remote`, dùng `http://127.0.0.1:54321` cho Supabase URL,
`http://127.0.0.1:54321/functions/v1/api` cho API URL và chép đúng `PUBLISHABLE_KEY` từ status
vào `.env`. Publishable key được phép nằm trong app; tuyệt đối không chép `SECRET_KEY` hoặc
`SERVICE_ROLE_KEY`.

Seed local chỉ dùng danh tính giả `an@example.test` / `local-demo-password`. Email local được
giữ trong SMTP inbox local; fake push/email provider không gọi mạng. Các lệnh vận hành:

```powershell
npm run supabase:status
npm run test:db
npm run supabase:reset # Xóa và dựng lại toàn bộ database local
npm run supabase:stop
```

Parity gap sau S2: local đã có due-scan/consumer/reconciliation nhưng chưa gửi notification thật.
Trusted contacts, invitation/contact web, full alert escalation, Resend và Expo Push thuộc S3;
Google OAuth, hosted secrets, staging và thiết bị/provider acceptance thuộc S4/release gate.
