# I’m Okay — Supabase MVP implementation plan

## 1. Mục tiêu và phạm vi

Plan này là kế hoạch implementation đang hoạt động cho toàn bộ MVP còn thiếu:

- Supabase Auth, PostgreSQL, SQL migrations, RLS và authoritative RPC.
- Edge Function HTTP router cho mobile và public contact web.
- Responsive contact web W01–W05.
- Cron, Queues/outbox, retry và reconciliation.
- Expo Push, email HTTP provider và alert escalation/correction.
- Local development, CI và staging acceptance.

Mobile M01–M12 đã hoàn tất client; plan này chỉ nối remote contract và không làm
lại UI. Release/store/production gate thuộc [`03-RELEASE.md`](03-RELEASE.md).

Kiến trúc chi tiết và trade-off đã chốt trong
[`ADR 0008`](../adr/0008-supabase-first-backend.md). State machine, public-token và notification
workflow S3 được ghi tại [`ADR 0010`](../adr/0010-contact-alert-notification-workflows.md).

## 2. Kiến trúc và trust boundary

```text
Expo mobile -----------\
                       >--- Supabase Auth + Edge Functions
Contact web -----------/                 |
                                         v
                                PostgreSQL + RLS/RPC
                                 |              |
                                 |              +-- Cron/reconciliation
                                 v
                          Outbox/Supabase Queues
                                 |
                                 v
                        Edge Function consumers
                           |-- Expo Push
                           |-- Resend/EmailProvider
                           |-- SMS disabled
                           `-- Voice disabled
```

Repository mục tiêu:

```text
apps/
  mobile/                 đã có
  contact-web/
supabase/
  config.toml
  migrations/
  functions/
    _shared/
    api/
    public-api/
    scheduler/
    notification-consumer/
    provider-receipts/
  tests/
  seed.sql
packages/                 chỉ tách khi có từ hai consumer thực
```

Ranh giới bắt buộc:

- PostgreSQL domain state là source of truth; queue chỉ là executor có thể dựng lại.
- Authenticated Edge Function dùng caller JWT/user-scoped client để `auth.uid()` và RLS còn
  hiệu lực; không dùng service role như lối tắt.
- Internal/public-token function chỉ dùng narrowly scoped RPC/service role khi cần và tự
  enforce actor/scope; không tin actor ID từ body.
- Client không ghi trực tiếp `alerts`, `alert_steps`, `alert_responses`,
  `notification_deliveries`, `audit_logs`, outbox hoặc queue.
- Provider call không chạy trong database transaction.
- Public token chỉ lưu hash, có scope/expiry/revoke và one-time action được consume
  atomically; GET không mutation.

## 3. Invariant không được nới lỏng

```text
nextDeadlineAt = lastCheckInAt + checkInInterval
```

- Interval MVP chỉ 24/36/48 giờ; timestamp lưu UTC, timezone hiển thị là IANA.
- Chỉ một active alert/safety plan.
- Check-in concurrent/retry chỉ áp dụng một lần nhờ row lock/version + unique
  idempotency key/payload hash.
- Check-in/plan update làm old schedule work stale bằng resource/policy version.
- `sent`/`delivered` không đồng nghĩa contact đã `acknowledged`.
- Sau khi contact đã được báo, user check-in/cancel phải có audit và correction.
- Snooze luôn có `ends_at`; SOS và drill phân biệt `source/type`.
- Mọi business mutation quan trọng commit state + audit + outbox intent cùng transaction.
- Queue consumer at-least-once phải reload state, stale-check và dùng stable delivery key.

Timeline 36 giờ mặc định vẫn là versioned policy:

```text
24h  push nhắc nhẹ
32h  push nhắc khẩn
35h  push + email user
36h  trigger alert + email contact ưu tiên 1
38h  nếu chưa acknowledged, email các contact còn lại
```

## 4. Contract cần giữ tương thích

`EXPO_PUBLIC_API_URL` trỏ tới Edge Function `api`; mobile tiếp tục gọi các family:

- `/v1/me`, `/v1/me/devices`, `/v1/me/settings`.
- `/v1/safety-plan`, `/v1/safety-plan/status`, snooze/resume/disable.
- `/v1/check-ins`, `/v1/trusted-contacts`, invitation resend/reorder.
- `/v1/alerts/current`, alert cancel/SOS/drill.
- `/v1/history`, `/v1/account/export-requests`, `/v1/account/deletion-requests`.
- `/v1/public/invitations/*` và `/v1/public/alerts/*` cho contact web.

Giữ JSON projection, `serverTime`, `Idempotency-Key` và stable error envelope mà mobile đã
test. Versioned Zod/TypeScript schema là public contract; Supabase generated DB type không
thay thế response contract.

## 5. Mô hình dữ liệu tối thiểu

```text
profiles (gắn auth.users)
user_devices
safety_plans
trusted_contacts
contact_invitations
check_ins
alerts
alert_steps
alert_responses
notification_deliveries
audit_logs
outbox_events / scheduling_intents
```

Database constraint/index bắt buộc bao phủ tối đa ba contacts, normalized contact email,
check-in idempotency, single active alert, delivery idempotency và outbox business key.

## 6. Bốn giai đoạn implementation

### S1 — Foundation

Mục tiêu: máy mới chạy được local stack và mobile có backend contract thật để nối.

- [x] Scaffold `apps/contact-web` và `supabase/`; không tạo `apps/api`/`apps/worker`.
- [x] Pin Supabase CLI/tooling và viết local start/stop/status/reset commands an toàn.
- [x] Tạo base migration, seed giả, RLS deny-by-default và auth test user lifecycle.
- [x] Tạo authenticated `api` và isolated `public-api` Edge Function routers.
- [x] Shared request validation, error envelope, correlation ID và sanitized logging.
- [x] Tạo versioned contract compatibility test với mobile adapter hiện có.
- [x] Enable/configure Cron và Queues bằng migration; ghi rõ local parity gap nếu có.
- [x] Tạo fake push/email provider và fake clock; local/CI không gửi thật.
- [x] Hoàn tất root CI cho mobile, contact web, migrations/RLS và Edge Functions.
- [x] Cập nhật README local setup từ máy trống.

Exit:

- Supabase local khởi động từ database trống và migration lặp lại được.
- JWT/RLS negative test, router/health và contract smoke xanh.
- Không có secret thật hoặc service-role key trong client/bundle/log.

Evidence 04/08/2026:

- Supabase CLI 2.111.0 khởi động local stack; `db reset --local` áp dụng lại ba migration và seed.
- 23 pgTAP database/RLS/auth-lifecycle/Cron/Queue test xanh.
- Auth sign-in, missing-JWT negative case, authenticated/public Edge health smoke xanh.
- Mobile 105 test/33 suite; mobile/contact/contracts/functions typecheck và lint xanh.
- Contracts/contact/mobile build thành công; local fake provider không gửi notification thật.
- Local parity gap: Cron chỉ có heartbeat, queue chưa có S2 consumer/due-scan/reconciliation;
  SMTP local không thay cho Resend/Expo Push hoặc staging provider evidence.

### S2 — Core check-in end-to-end

Mục tiêu: onboarding và check-in hoạt động thật khi app đóng/mở lại.

- [x] Implement profile, timezone IANA, device-token lifecycle và account-disabled handling.
- [x] Implement safety-plan create/update/activate/disable và exact status projection.
- [x] Implement authoritative deadline function và versioned warning/escalation policy.
- [x] Implement check-in transaction: lock/version, idempotency, deadline, alert transition,
      audit và outbox.
- [x] Implement Cron due-scan theo batch; không tạo cron job/user.
- [x] Implement queue claim/lease/stale-check và reconciliation dựng lại missing work.
- [x] Nối remote MA2–MA3 mà không đổi projection/error contract.
- [x] Test check-in trước/đúng/sau deadline, duplicate/concurrent/offline/timeout.
- [x] Test queue deletion, lease expiry và function termination/reinvoke.

Exit:

- Mobile onboarding và check-in thật hoạt động trên local/integration environment.
- Concurrent request không tạo chu kỳ trùng; old work không trigger alert sai.
- Xóa queue message có thể reconciliation lại mà không gửi side effect trùng.

Evidence 04/08/2026:

- Migration S2 dựng lại thành công từ database trống; database lint không có lỗi.
- 74 pgTAP test xanh: 23 foundation + 51 core check-in, gồm 24/36/48 giờ, DST/UTC,
  IANA timezone, create/update/activate/disable, trước/đúng/sau deadline và account disabled.
- Check-in dùng row lock, persisted response snapshot và unique idempotency; local Edge smoke chạy
  hai request đồng thời cùng key và nhận đúng một projection/cycle.
- Một Cron batch job thay heartbeat S1; due-scan, outbox publish, PGMQ visibility lease,
  stale version check và reconciliation queue deletion đều có database test.
- Auth/profile/device/safety-plan/status/check-in/disable chạy qua Edge local; authenticated role
  không có quyền execute internal RPC hoặc update trực tiếp bảng safety plan.
- Mobile remote onboarding khôi phục server state khi mở lại app; remote check-in giữ
  `serverTime`, authoritative deadline, offline/timeout và publishable-key header contract.
- Mobile 109 test/34 suite, Edge 11 test, contract 3 test và contact foundation 1 test xanh;
  lint/typecheck, Expo dependency check, contact web build và mobile Android/iOS/web export xanh.
- S2 chưa gửi push/email thật và chưa thông báo trusted contact. Các side effect/provider cùng
  alert escalation đầy đủ thuộc S3; Google OAuth, staging và thiết bị thật vẫn thuộc S4/gate ngoài.

### S3 — Contacts, alerts and contact web

Mục tiêu: hoàn thành luồng invitation→alert→response→correction end-to-end.

- [x] Implement contact CRUD, maximum-three/duplicate constraints và atomic priority reorder.
- [x] Implement invitation token hash/scope/expiry/revoke/consume, resend cooldown và audit.
- [x] Hoàn tất contact-web W01–W05 cùng invalid/expired/used/revoked/cancelled/resolved states.
- [x] Implement public projection/action RPC; GET không mutation, POST consume/transition atomically.
- [x] Thêm CSP, CORS allowlist, `no-referrer`, `no-store`, `noindex` và token/Sentry scrub.
- [x] Implement alert state machine, single-active-alert constraint và allowed actions.
- [x] Implement NotificationDispatcher, delivery log, retry/backoff và unknown-outcome handling.
- [x] Implement Expo Push ticket/receipt/invalid-token lifecycle.
- [x] Implement Resend `EmailProvider` với escaped/versioned templates và test sender.
- [x] Implement priority escalation, stop condition và correction sau user check-in/cancel.
- [x] Implement finite snooze, guarded SOS và distinct drill source.
- [x] Implement history/settings projection, recent-auth, export và deletion-request workflow.
- [x] Nối remote MA4–MA6 và chạy contact-web responsive/accessibility test tự động ở local.
- [x] Test public-token concurrency, provider transient/permanent/unknown và duplicate delivery.

Exit:

- Invitation và accelerated alert flow chạy qua fake providers mà không gửi trùng.
- `delivered` không tự acknowledge/resolve; drill không thể bị hiểu là alert thật.
- Public page không lộ token/PII qua log, referrer, cache, analytics hoặc projection.

Lưu ý UX: Stitch Web không hỗ trợ nối cross-screen prototype. W02→W05 được
chốt bằng route contract và kiểm thử trong contact web, không chờ link trên canvas.

Evidence 04/08/2026:

- Ba migration S3 dựng contacts/invitations, alert response/correction, notification delivery và
  provider receipt từ database trống; 123 pgTAP test bao phủ S1–S3 và database lint không có lỗi.
- Local S3 smoke chạy auth → invitation public GET/accept → contacts/reorder → safety plan → SOS →
  fake delivery → contact acknowledge/resolve → history/export. S2 smoke vẫn xanh sau schema S3.
- Edge unit test bao phủ public GET không mutation, CORS/privacy headers, recent-auth, route contract,
  fake-provider dedupe, transient/permanent/unknown, escaped template, Resend idempotency và Expo
  `DeviceNotRegistered` ticket/receipt lifecycle.
- Contact web W01 và W02–W05 có invalid/expired/used/revoked/cancelled/resolved state, static privacy
  headers, route/source test, typecheck/lint và production web build. Automated browser screenshot bị
  chặn bởi Chrome CDP timeout; visual 390/768/1440, keyboard/screen-reader và zoom 200% vẫn là gate S4.
- Mobile contract MA4–MA6 giữ projection/idempotency và toàn bộ 109 test/34 suite xanh. Local/CI chỉ
  dùng fake provider; chưa gửi email/push thật, chưa deploy và không ghi nhận staging/device evidence.

### S4 — Staging acceptance

Mục tiêu: chứng minh reliability và security trên môi trường gần production.

- [ ] Tạo Supabase staging project, contact-web HTTPS domain và auth redirect tách production.
- [ ] Cấu hình project secrets, test sender/recipients/devices đã consent và provider kill switch.
- [ ] Deploy expand migration → backward-compatible functions → contact web/mobile config.
- [ ] Chạy accelerated full alert flow với Expo Push và email thật.
- [ ] Đo Edge Function error/latency, cron run, scheduler lag, queue age/depth/retry/dead-letter.
- [ ] Chạy function termination, queue loss/lease expiry, provider outage và reconciliation drill.
- [ ] Xác minh RLS/IDOR/rate-limit/public-token negative cases và PII scrub.
- [ ] Cấu hình backup/PITR theo plan và thực hiện restore sang isolated environment.
- [ ] Chạy mobile remote gates và contact-web 390/768/1440 px, keyboard/screen-reader/zoom 200%.
- [ ] Ghi measured SLO baseline, known limitations và runbook cho outage/backlog/unknown delivery.

Exit:

- Không còn check-in false success, duplicate/missing alert hoặc authorization/token blocker.
- Full alert/correction/recovery flow có test evidence trên staging.
- Backup đã restore thật; operator phát hiện được overdue work và provider failure.

## 7. Kiểm thử bắt buộc

- Database: migration từ empty DB, constraints, RLS auth/anon/internal matrix, transaction rollback.
- Domain: 24/36/48, timezone/DST, state transition, snooze expiry, SOS/drill/correction.
- Integration: Edge API→DB/outbox→queue→consumer→fake provider.
- Concurrency: check-in, invitation response, alert response, scheduler/consumer claim.
- Recovery: function termination, queue loss/lease expiry, provider timeout/unknown, restore.
- Client/E2E: onboarding, check-in offline/timeout, invitation, escalation, SOS guard, history/settings.
- Accessibility/security: screen reader, keyboard/zoom, CSP/referrer/cache, token/PII scrub.

Dùng fake clock và fake providers mặc định. Provider smoke thật chỉ chạy trên staging
với explicit flag và test recipient đã consent.

## 8. Definition of Done

Supabase MVP hoàn thành khi:

- S1–S4 exit criteria đều có automated test hoặc external evidence phù hợp.
- App đóng vẫn có server-side scheduling; PostgreSQL dựng lại được missing queue work.
- Mutation nhạy cảm có auth/RLS, transaction, idempotency, audit và outbox.
- Provider side effect có timeout, retry classification, stable delivery key và reconciliation.
- Public token/PII/secret không lọt qua client, log, Sentry, referrer, cache hoặc artifact.
- Mobile/contact web nói trung thực giới hạn hệ thống và đạt accessibility gate.
- Staging monitoring, recovery runbook và restore evidence đã có.

## 9. Bước tiếp theo

S1–S3 đã hoàn tất trong local/integration. Bước tiếp theo là S4 staging acceptance; không đánh dấu
provider/device/visual gate hoàn tất bằng fake-provider evidence.
Mỗi stage chỉ đóng khi exit criteria xanh và có bằng chứng trong repository/staging.
