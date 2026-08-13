# I’m Okay

I’m Okay là ứng dụng safety check-in dành cho người sống một mình. Người dùng định kỳ xác nhận
“Tôi vẫn ổn”; nếu quá deadline, backend nhắc người dùng và thông báo cho trusted contact.

> I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ, thiết bị y tế hoặc hệ thống bảo đảm
> ứng cứu khẩn cấp.

## Bắt đầu ở đây

- Agent/session mới: đọc [`AGENTS.md`](AGENTS.md), sau đó đọc
  [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md).
- Tiến độ, build mới nhất, blocker và việc tiếp theo: chỉ cập nhật
  [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md).
- Thiết kế: [`design/stitch/README.md`](design/stitch/README.md) và
  [`design/stitch/DESIGN.md`](design/stitch/DESIGN.md).

## Trạng thái

Tại ngày 13/08/2026:

- Android personal pilot đã sẵn sàng trên Supabase staging.
- Mobile M01–M12, contact web W01–W05 và backend check-in/contact/alert cốt lõi đã triển khai.
- APK staging mới nhất được build từ commit `9ddce5e22c62`, cài và smoke pass trên TECNO KJ7.
- Contact web staging: <https://im-okay-contact-staging.vercel.app>.
- Chưa phát hành Google Play/TestFlight; iOS, Sentry, hosted restore, legal/support và full device matrix
  còn là gate trước internal release hoàn chỉnh.

Chi tiết và evidence hiện hành nằm trong [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md). Không dùng
README như checklist tiến độ thứ hai.

## Kiến trúc

```text
Expo mobile          Contact web
      \                 /
       Supabase Auth + Edge Functions
                    |
          PostgreSQL + RLS/RPC
                    |
          Cron + Queues/outbox
                    |
        Expo Push + EmailProvider
```

- Supabase là application backend duy nhất của MVP.
- Firebase chỉ làm FCM transport cho Expo Push trên Android.
- PostgreSQL/RPC quyết định deadline và alert state; client không tự suy đoán trạng thái authoritative.
- Gmail SMTP là adapter tạm cho personal pilot, không phải provider mục tiêu cho beta rộng/production.

Các quyết định và lý do nằm trong [`docs/adr/`](docs/adr/).

## Repository

```text
apps/mobile/          Expo + React Native mobile app
apps/contact-web/     Responsive public contact web
packages/contracts/   Shared API contracts
supabase/migrations/  Schema, RLS, RPC, Cron và Queues
supabase/functions/   API, public API, consumers, receipts và ops
scripts/              Smoke, preflight, security và observability
docs/adr/             Quyết định kiến trúc
docs/release/         Runbook build/staging/privacy/incident
docs/qa/              Device matrix và evidence template
design/stitch/        Visual specification và Stitch metadata routing
```

## Yêu cầu phát triển

- Node.js `>=24` theo `package.json`/`.nvmrc`.
- pnpm `11.18.0` qua Corepack.
- Docker Desktop cho Supabase local.
- Android Platform Tools/ADB cho device test.
- EAS account/credential chỉ cần khi tạo signed build.

## Cài đặt

Từ repo root:

```powershell
corepack enable
corepack pnpm install
```

Public env mẫu không được chứa secret. Không đưa service-role key, SMTP password hoặc FCM credential
vào `EXPO_PUBLIC_*`, source hoặc tài liệu.

## Chạy mobile

```powershell
npm run dev:mobile
```

Các data mode:

- `fixture`: chỉ dùng với `EXPO_PUBLIC_APP_ENV=local`; UI phải nói rõ không có bảo vệ thật.
- `remote`: gọi Supabase API thật; staging build hiện dùng mode này.

Kiểm tra riêng mobile:

```powershell
npm --prefix apps/mobile run lint
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
npm --prefix apps/mobile run build
```

## Chạy contact web

```powershell
npm run dev:contact-web
```

Contact web xử lý invitation và alert bearer link. Raw token không được log, đưa vào analytics hoặc
hiển thị lại trong UI.

## Chạy Supabase local

```powershell
npm run supabase:start
npm run test:integration
```

Endpoint local:

- Public: `http://127.0.0.1:54321/functions/v1/public-api/v1/health`.
- Authenticated: `http://127.0.0.1:54321/functions/v1/api/v1/health`.

Các lệnh vận hành local:

```powershell
npm run supabase:status
npm run test:db
npm run supabase:reset
npm run supabase:stop
```

`supabase:reset` xóa và dựng lại dữ liệu local; không dùng với hosted project.

## Kiểm tra toàn repository

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Hoặc chạy toàn bộ chuỗi không bao gồm hosted smoke:

```powershell
pnpm check
```

Test mặc định dùng fake provider. Gửi notification thật chỉ được thực hiện trong supervised staging
window với recipient/device đã đồng thuận và operator đã xác minh kill switch.

## Tài liệu còn lại

| Nhu cầu                   | Tài liệu                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Tiến độ và việc tiếp theo | [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md)                                         |
| Hướng dẫn agent           | [`AGENTS.md`](AGENTS.md)                                                                   |
| UI/UX                     | [`design/stitch/README.md`](design/stitch/README.md)                                       |
| Design tokens             | [`design/stitch/DESIGN.md`](design/stitch/DESIGN.md)                                       |
| Kiến trúc                 | [`docs/adr/`](docs/adr/)                                                                   |
| Mobile build/release      | [`docs/release/MOBILE-RELEASE-RUNBOOK.md`](docs/release/MOBILE-RELEASE-RUNBOOK.md)         |
| Staging operations        | [`docs/release/STAGING-OPERATIONS-RUNBOOK.md`](docs/release/STAGING-OPERATIONS-RUNBOOK.md) |
| Privacy/terms             | [`docs/release/PRIVACY-TERMS-READINESS.md`](docs/release/PRIVACY-TERMS-READINESS.md)       |
| Incident/support          | [`docs/release/SUPPORT-INCIDENT-RUNBOOK.md`](docs/release/SUPPORT-INCIDENT-RUNBOOK.md)     |

Không tạo thêm roadmap, progress plan hoặc screen prompt rời nếu nội dung có thể cập nhật trong nguồn
tương ứng ở bảng trên.
