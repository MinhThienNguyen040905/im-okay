# ADR 0008 — Supabase-first backend cho MVP

- Trạng thái: Accepted
- Ngày: 2026-08-04
- Phạm vi: backend, scheduling, notification, data/infra, contract mobile/contact web
- Thay thế: kiến trúc MVP NestJS + Prisma + Redis/BullMQ + worker trong roadmap/plan cũ
- Bị thay thế một phần bởi: ADR 0012 cho email provider của personal pilot
- Được làm rõ bởi: ADR 0013 cho FCM chỉ là Android transport của Expo Push

## Bối cảnh

Mobile MA0–MA6 và phần hardening MA7 đã hoàn tất theo contract authoritative, nhưng
backend, contact web và scheduling/notification system chưa có source. Dự án đã chọn
Supabase Auth và hosted
PostgreSQL; việc dựng thêm NestJS API, Prisma, Redis và BullMQ tạo bốn bề mặt vận hành
trước khi MVP có người dùng thật.

Mục tiêu là rút ngắn thời gian ra staging mà không nới lỏng các invariant deadline,
transaction, idempotency, public token, audit, retry và reconciliation. “Không dùng NestJS”
không có nghĩa client được tự quyết định alert hoặc ghi thẳng vào bảng nhạy cảm.

## Quyết định

### 1. Nền tảng MVP

Dùng một Supabase project tách biệt cho mỗi môi trường:

- Supabase Auth cho email và Google.
- Supabase PostgreSQL là source of truth.
- SQL migration trong `supabase/migrations`; không dùng Prisma cho MVP.
- PostgreSQL function/RPC cho business command cần transaction, lock và constraint.
- Supabase Edge Functions là HTTP boundary cho mobile, contact web và provider.
- Supabase Cron kích hoạt scan deadline/reconciliation định kỳ.
- Supabase Queues/Postgres outbox lưu công việc cần retry; không dùng Redis/BullMQ.
- Expo Push và một email provider HTTP qua adapter. Resend là lựa chọn mặc định
  cho MVP serverless; ADR 0012 cho phép Gmail SMTP tạm thời trong personal pilot không domain,
  nhưng không thay đổi đường production verified-domain provider.

```text
Expo mobile -----------\
                       >--- Supabase Auth + Edge Functions
Contact web -----------/                 |
                                         v
                                PostgreSQL + RLS/RPC
                                  |             |
                                  |             +-- Cron scanner/reconciliation
                                  v
                           Outbox/Supabase Queues
                                  |
                                  v
                         Edge Function consumers
                            |-- Expo Push
                            |-- Email HTTP provider
                            |-- SMS disabled
                            `-- Voice disabled
```

Firebase không được thêm như application backend song song trong MVP. Nó sẽ nhân đôi
auth, data model, secret, observability và quy trình deploy trong khi PostgreSQL phù hợp hơn với
transaction và quan hệ của I’m Okay. ADR 0013 cho phép Firebase project hẹp chỉ để cấp
FCM transport bắt buộc cho Android Expo Push; không dùng Firebase Auth/data/functions.

### 2. Giữ contract client đã hoàn thành

- Giữ các milestone `MA0`–`MA7` cho lịch sử mobile. Các mã `BA*`, `WN*`, `DI*`, `WA*`
  và `QR*` trong plan cũ chỉ còn là tham chiếu lịch sử. Trạng thái hiện hành được gộp vào
  `docs/PROJECT-STATUS.md` để tránh trùng task/status.
- Giữ route logic `/v1/...`, JSON projection, `Idempotency-Key` và error code mà mobile
  đang kiểm tra. `EXPO_PUBLIC_API_URL` trỏ tới Edge Function router; client không cần biết
  command được thực thi bằng SQL RPC.
- Dùng versioned Zod/TypeScript contract và contract test trong `packages/contracts` khi có
  consumer thứ hai. Supabase generated database types không thay thế public API contract.
- OpenAPI không còn là release dependency bắt buộc cho MVP. Chỉ bổ sung khi có consumer
  hoặc tooling thực sự cần.

### 3. Transaction và trust boundary

- Edge Function xác minh JWT/public token, validate request, gọi một authoritative SQL command
  và map kết quả sang projection/error contract. Authenticated command ưu tiên user-scoped
  database client mang JWT để `auth.uid()`/RLS còn hiệu lực; không dùng service role như
  lối tắt. Function không tự tính deadline rải rác.
- Check-in, snooze, SOS, drill, contact reorder, invitation/response consumption và alert
  transition phải atomically commit business state, audit và outbox/queue intent.
- Database constraint bảo vệ idempotency, tối đa ba contact, unique contact, một active
  alert và unique delivery action. Dùng row lock/optimistic version khi có race.
- Mobile/contact web không bao giờ nhận service-role key. Internal/public-token function chỉ
  dùng narrowly scoped RPC/service role khi cần và phải tự enforce actor/scope; không tin
  actor ID từ request body. RLS deny-by-default cho bảng domain;
  các bảng `alerts`, `alert_steps`, `alert_responses`, `notification_deliveries`, `audit_logs`,
  `outbox_events` và queue không cho client ghi trực tiếp.

### 4. Scheduling, retry và reconciliation

- Không tạo một cron job cho mỗi user. Một scheduler ngắn chạy định kỳ, claim theo
  batch các row `due_at <= now()` bằng transaction/lock và tạo outbox/queue message idempotent.
- Deadline là timestamp authoritative. Dispatch diễn ra ở lần scheduler thành công đầu tiên
  tại hoặc sau deadline; staging phải đo scheduler lag trước khi chốt SLO.
- Queue consumer reload state hiện tại, kiểm tra resource/policy version và bỏ qua message
  stale. Provider call luôn nằm ngoài DB transaction.
- Mỗi side effect có stable idempotency key, visibility timeout/lease, attempt count, backoff,
  transient/permanent/unknown classification và failed/dead-letter inspection path.
- Reconciliation quét deadline thiếu intent, message lease hết hạn, delivery stuck và outbox
  chưa publish. Queue có thể xóa/dựng lại từ PostgreSQL domain state mà không gửi trùng.

### 5. Deploy và observability

- `supabase/config.toml`, migrations, functions và seed giả được version control.
- Local dùng Supabase CLI; staging/production là project tách biệt.
- Secret provider chỉ nằm trong Supabase project secrets/Vault phù hợp; không đặt trong
  `EXPO_PUBLIC_*`, migration, log hay CI artifact.
- Theo dõi Edge Function error/latency, cron run/lag, queue age/depth, retry/dead-letter,
  reconciliation repair, provider result và deadline quá hạn chưa có alert.

## Hệ quả

- Giảm deployable MVP từ API + worker + PostgreSQL + Redis xuống một Supabase backend và
  contact web, phù hợp mục tiêu ra staging nhanh.
- Không có NestJS dependency injection, Prisma schema hay BullMQ delayed-job API; team phải
  test SQL function/RLS/queue behavior bằng Supabase local và integration test.
- Edge Functions phải ngắn, idempotent và theo batch. Tác vụ dài/heavy không được nhồi
  vào request hoặc scheduler invocation.
- Nếu staging chứng minh Supabase Cron/Queues/Edge Functions không đạt SLO, quota, khả
  năng quan sát hoặc recovery cần thiết, tạo ADR mới để tách worker/API. Không thêm
  NestJS/Redis theo phòng hờ khi chưa có bằng chứng.

## Quan hệ với ADR mobile

ADR 0001–0007 vẫn Accepted cho hành vi client đã triển khai. Mọi tham chiếu trong các ADR
đó tới NestJS, Prisma, BullMQ, Redis, worker riêng hoặc OpenAPI bắt buộc được thay thế
bằng quyết định trong ADR này; projection, idempotency, safety copy và external-acceptance
boundary của mobile không thay đổi.

## Tài liệu nền tảng

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Queues với Edge Functions](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
