# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận mình vẫn an toàn; nếu quá hạn, hệ thống sẽ nhắc người dùng và thông báo cho các liên hệ tin cậy.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hoặc thiết bị y tế.

## Trạng thái dự án

Dự án đã hoàn tất phần client Mobile MA0–MA6 và hardening MA7 có thể chứng minh
trong repository. `apps/mobile` hiện có Expo SDK 57/Expo Router, Supabase auth adapter và
M01–M12; reduced-motion/focus/dynamic-font hardening, incoming-link allowlist, Sentry PII scrub,
EAS profiles, Maestro fixture smoke, device matrix và release/rollback runbook đã có. Check-in,
trusted contacts, alert và settings vẫn tuân thủ projection/idempotency authoritative; app không tự
tính production deadline hay nhận public contact token. Android personal-pilot acceptance đã
đạt trên staging/device/provider thật ngày 11/08/2026; Sentry,
iOS, full accessibility matrix và store rollout chuyển sang post-MVP hardening. Chưa có
build/submit/deploy lên TestFlight hoặc Google Play.

S1–S3 đã hoàn tất trong local/integration ngày 04/08/2026. `apps/contact-web`, contract v1,
Supabase migrations/RLS/seed và authenticated/public Edge routers đã có; profile/timezone IANA,
device token, safety plan, authoritative check-in/deadline, Cron batch, outbox/PGMQ lease,
stale-job check, reconciliation, trusted contacts, public invitation/alert response, correction,
snooze/SOS/drill, history/settings và account request đều chạy bằng backend thật. Database reset từ
trống, 150 pgTAP test, S2/S3 local smoke, 33 Edge/guard test và client builds đều xanh.
W01–W05 đã có production web build. Ngày 09/08/2026, S4 repository readiness bổ sung rate limit,
provider kill switch/timeout, aggregate ops snapshot, Vault-backed hosted Cron, guarded deploy/preflight,
runbook và browser QA nền 390/768/1440 px. Project `im-okay-staging` tại Singapore đã được tạo,
CLI login/link đã xác minh; 8 migration và 5 Edge Functions đã deploy, Vault cho hosted workers đã
cấu hình, public/ops health đều trả `200`, còn API không JWT trả `401`. Notification delivery vẫn
tắt. Contact web staging đã deploy tại `https://im-okay-contact-staging.vercel.app`; Auth URL/redirect,
exact CORS và non-mutating preflight đều xanh. Hosted JWT/actor-binding/IDOR/RLS/token/rate-limit
negative matrix đã xanh; observability recheck 30 mẫu có error `0/30`, p50 `169 ms`, p95 `296 ms`
và Cron/queue/dead-letter/overdue đều khỏe. Exact-commit EAS build
`61b9016f-3a3f-4087-aae3-b2be119d65f6` đã cài trên TECNO KJ7; Expo ticket/receipt xanh.
Contact đã chấp nhận và một accelerated cycle tạo đúng một push reminder, một Gmail alert,
một acknowledgement và một Gmail correction, không missing/duplicate; kill switch đã tắt lại.
Firebase Android app chỉ làm FCM transport; Supabase vẫn là backend duy nhất. Source đã sửa
native token-rotation bug và 133 mobile test/38 suite xanh; candidate Android
`3768ba65-ac54-47ad-b8d2-d23928d0cf15` từ commit `f1236d5cb789` chứa fix đã `FINISHED`, cài và
device smoke pass trên TECNO KJ7: session/check-in/History/push registration xanh, không có native
token mới hoặc crash. Plan 03 staging RC gate đang thực hiện. Local fault/reconciliation và isolated
restore rehearsal đã pass, nhưng hosted backup/PITR chưa có. Accessibility đầy đủ, hosted fault
drill, SLO dài hạn, Sentry, iOS và store vẫn là release blockers trước internal alpha/beta.
Invariant cycle, policy 24/36/48 và recovery được ghi tại
[`ADR 0009`](docs/adr/0009-core-check-in-cycle-scheduling.md); contact/token/alert/provider workflow
được ghi tại [`ADR 0010`](docs/adr/0010-contact-alert-notification-workflows.md); staging security và
observability được ghi tại [`ADR 0011`](docs/adr/0011-staging-security-observability.md).
Gmail SMTP tạm thời và đường chuyển sang verified-domain provider được ghi tại
[`ADR 0012`](docs/adr/0012-temporary-gmail-smtp-personal-pilot.md).
FCM chỉ là Android transport cho Expo Push, không phải application backend song song; xem
[`ADR 0013`](docs/adr/0013-android-fcm-transport-for-expo-push.md).

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
- Release artifacts: [mobile runbook](docs/release/MOBILE-RELEASE-RUNBOOK.md),
  [staging operations](docs/release/STAGING-OPERATIONS-RUNBOOK.md),
  [privacy/terms readiness](docs/release/PRIVACY-TERMS-READINESS.md) và
  [support/incident runbook](docs/release/SUPPORT-INCIDENT-RUNBOOK.md).

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
- EmailProvider qua adapter; Gmail SMTP dùng tạm cho personal pilot, Resend giữ làm đường
  verified-domain provider khi triển khai rộng.

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
development build và thiết bị thật. Riêng Android còn cần Firebase Android app,
`google-services.json` được khai báo qua `android.googleServicesFile` và FCM V1 service-account
credential được nạp an toàn vào EAS; không commit private key.

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

Authenticated routes gồm `/v1/me`, `/v1/me/devices`, `/v1/me/settings`, `/v1/safety-plan`,
`/v1/safety-plan/status`, `/v1/safety-plan/disable`, `/v1/safety-plan/snooze`, `/v1/check-ins`,
`/v1/trusted-contacts`, `/v1/alerts/current`, `/v1/alerts/sos`, `/v1/alerts/drill`, `/v1/history`
và account export/deletion requests. Public contact web dùng `/v1/public/invitations/:token` và
`/v1/public/alerts/:token`. Tất cả mutation domain đi qua Edge + internal RPC; client không nhận
service-role key.

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
npm run supabase:reset # Xóa local stack data và dựng lại từ migrations/seed
npm run supabase:stop
```

Các Edge consumer S3 mặc định không gửi mạng. Xem biến mẫu phía server tại
`supabase/functions/.env.example`; chỉ bật `NOTIFICATION_PROVIDER_MODE=live` trên staging cùng
Gmail SMTP/Expo secrets và test recipients/devices đã consent. Local smoke trực tiếp chạy claim → fake
provider → persist outcome, bao gồm retry/unknown và invalid Expo token qua unit test.

Parity gap cho personal pilot đã đóng: artifact, Expo receipt, contact acceptance và provider E2E
đều có evidence thật; staging kill switch đã trả về `false`. Browser nền đã kiểm tra
390/768/1440, keyboard focus và `lang=vi`. Known limitation là token-rotation candidate chưa qua
device smoke. Hosted backup/PITR restore, measured SLO, hosted fault drill, zoom/screen reader/full
device matrix chuyển sang post-MVP release gate.
