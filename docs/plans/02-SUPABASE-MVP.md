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

#### S4A — Repository readiness

- [x] Implement distributed rate limit cho authenticated/public mutation, chỉ lưu SHA-256 subject.
- [x] Thêm notification kill switch fail-closed ở live và provider HTTP timeout.
- [x] Thêm Vault-backed hosted Cron invocation, rate-limit cleanup và aggregate `ops` projection.
- [x] Thêm guarded deploy dry-run/apply script, non-mutating preflight và staging env examples.
- [x] Viết ADR, staging operations runbook và evidence template.
- [x] Reset database từ trống; chạy 150 pgTAP, S2/S3 smoke, 26 Edge và 109 mobile test.
- [x] Build Android/iOS/web và kiểm tra contact web nền ở 390/768/1440 px + keyboard focus.

#### S4B — Hosted staging acceptance

- [x] Tạo Supabase project `im-okay-staging` tại Singapore và xác minh CLI login/project healthy.
- [x] Link repository đúng staging project và review dry-run: 8 migration pending, không seed.
- [x] Cấu hình internal/rate-limit secrets, ba Vault secret cho hosted workers và giữ delivery off.
- [x] Apply 8 expand migration và deploy 5 backward-compatible Edge Functions.
- [x] Deploy contact-web HTTPS staging và cấu hình Auth site URL/redirect tách production.
- [x] Cấu hình exact public CORS/link URL và chạy non-mutating hosted preflight với delivery off.
- [ ] Cấu hình Resend sender, test recipients/devices đã consent và provider acceptance secrets.
- [x] Tạo EAS project/environment, cấp publishable key và chạy mobile staging build trên thiết bị.
- [ ] Chạy accelerated full alert flow với Expo Push và email thật.
- [x] Đo snapshot Edge Function error/latency, cron run, queue age/depth/retry/dead-letter.
- [ ] Tích lũy scheduler lag p50/p95/max và chốt alert threshold từ chuỗi đo staging.
- [ ] Chạy function termination, queue loss/lease expiry, provider outage và reconciliation drill.
- [x] Xác minh hosted RLS/IDOR/rate-limit/public-token negative cases và PII scrub.
- [ ] Cấu hình backup/PITR theo plan và thực hiện restore sang isolated environment.
- [ ] Chạy mobile remote gates và contact-web token routes, keyboard/screen-reader/zoom 200%.
- [ ] Ghi measured SLO baseline, known limitations và runbook cho outage/backlog/unknown delivery.

Repository readiness evidence 09/08/2026 (chưa thay thế staging evidence):

- Migration S4 thêm fixed-window rate limit chỉ lưu SHA-256 subject, aggregate operational snapshot,
  hosted Cron invocation qua Vault và cleanup; reset từ database trống cùng 150 pgTAP test đều xanh.
- Authenticated/public mutation rate limit, notification kill switch mặc định tắt ở live, provider HTTP
  timeout, internal `ops` route và hosted secret-key compatibility có 26 Edge test xanh.
- S2/S3 local smoke vẫn xanh sau hardening; mobile 109 test/34 suite, contact web 4 test, contracts
  3 test, lint/typecheck và Android/iOS/web export đều xanh.
- Contact web production build không tràn ngang tại 390/768/1440 px, native link nhận focus bằng Tab,
  một H1 và `lang=vi`. Browser zoom 200%, screen reader và toàn bộ token-state routes vẫn là gate mở.
- Đã có deploy dry-run/apply guard, non-mutating staging preflight, evidence template và
  [`staging operations runbook`](../release/STAGING-OPERATIONS-RUNBOOK.md).
- Supabase project `im-okay-staging` đã được tạo tại Singapore, CLI login/link đã xác minh và dry-run
  liệt kê đúng 8 migration pending mà không seed.

Hosted backend deployment evidence 09/08/2026:

- Đã apply đủ 8 migration; remote migration history khớp cả 8 version local.
- Năm Edge Functions `api`, `public-api`, `notification-consumer`, `provider-receipts` và `ops`
  đều ở trạng thái `ACTIVE`.
- Đã cấu hình internal/rate-limit secret và ba Vault secret cho hosted workers mà không ghi giá trị
  vào repository/log; `NOTIFICATION_DELIVERY_ENABLED=false` nên chưa gửi notification thật.
- Public health và internal ops health trả `200`; authenticated API health không JWT trả `401`.
- Contact web đã deploy tại `https://im-okay-contact-staging.vercel.app`; Supabase Auth Site URL và
  redirect allowlist có domain web cùng `imokay://**`.
- Preflight sau deploy xanh: privacy headers/exact CORS/negative auth/ops; 10 health sample có
  p50 `169 ms`, p95 `1604 ms`. Bốn Cron job active, các run quan sát gần nhất đều succeeded,
  `cronFailuresLastHour=0`, queue/outbox/dead-letter đều `0`.
- Hosted public negative checks: invalid token trả projection generic, action sai `400`, origin sai
  `403` không ACAO và request thứ 11 trong public-action window trả `429`. Guarded security smoke tạo
  hai synthetic `.test` users, xác minh malformed JWT `401`, Edge actor binding, cross-user read rỗng,
  cross-user update bị chặn, actor-spoof RPC và audit mutation bị chặn; cleanup `2/2` pass.
- Observability baseline 30 health sample lúc `2026-08-09T11:22:42.463Z`: p50 `161 ms`, p95
  `258 ms`, max `790 ms`, error `0/30`; Cron failure, overdue work, queue/outbox/dead-letter và
  receipt backlog đều `0`, scheduler heartbeat age `40 s`. Đây là snapshot ngắn, chưa phải SLO dài hạn.
- Contact-web hosted invalid-token route hiển thị trạng thái an toàn, không render token.
- EAS project `@minh004/im-okay` đã liên kết với project ID
  `3ea9c673-0f86-4d5e-a802-53899da19dcb`; Preview environment chỉ có các biến public staging.
  Android internal APK build nền `be78049b-0f7e-4bee-a7f4-c18637d00b65` đã ký và hoàn tất.
- APK staging đã cài trên TECNO KJ7, Android 14/API 34; onboarding → login smoke pass và
  logcat không có FATAL/React Native error. Sentry source-map upload được tắt riêng cho
  local/staging khi chưa có Sentry auth; production không bị tắt.
- Login font `200%` và external-keyboard focus order đã pass trên thiết bị, font được restore `1.0`.
  Magic-link mới tới test account đã consent mở đúng app; authenticated session vẫn được khôi phục
  sau force-stop/mở lại trên TECNO KJ7.
- Expired magic-link callback thực tế có Supabase parameter `sb`; incoming-link guard cũ phân loại
  nhầm thành unsupported. Guard/regression test đã sửa và EAS snapshot build
  `34309c7e-92f1-4842-9001-5e37d020eb99` đã cài đè thành công; callback link mới/session restore pass.
- Auth quota mặc định đã reset và lần gửi kế tiếp thành công. Client-side friendly error mapping đã
  thêm test và đã có trong EAS staging snapshot `ecb41bd6-1c40-4c54-84ab-ed0f015b80ea`; custom SMTP
  vẫn cần cho test ổn định.
- Authenticated remote smoke đã cập nhật profile timezone sang `Asia/Ho_Chi_Minh`, xác minh deadline
  local-time, thực hiện check-in thật và đọc lại bản ghi History.
- Client đã tách alert `scheduled` khỏi nhóm cần chú ý và làm rõ copy check-in trước notification mà
  không đổi backend/state machine. 128 mobile test pass; EAS snapshot trên đã cài đè, giữ session và
  UI dump trên TECNO KJ7 xác nhận không còn card/nút cảnh báo cho chu kỳ `scheduled`; logcat sạch.
- Đã thêm `staging:provider-readiness`: guard chỉ đọc tên secret, yêu cầu explicit sender/recipient/
  device confirmation, không in secret value và không mutate delivery. Ba guard test cùng 26 Edge
  test pass. Lần chạy thật ngày 10/08/2026 fail-closed vì còn thiếu `RESEND_API_KEY`, `RESEND_FROM`
  và ba confirmation; ADB chưa thấy thiết bị online trong phiên audit này.
- Resend/test recipients, provider flow, Google/fresh-user onboarding, full accessibility,
  fault/reconciliation drill, SLO dài hạn và backup restore vẫn là gate mở; delivery tiếp tục tắt.

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

S1–S3, S4A, backend/contact-web deploy, Auth URL/CORS, non-mutating preflight, hosted security
negative matrix, observability snapshot và Android staging device smoke của S4B đã hoàn tất.
Bước tiếp theo là verify Resend sender, cấu hình `RESEND_API_KEY`/`RESEND_FROM`, ghi rõ test recipients
và device đã consent rồi chạy lại `staging:provider-readiness`. Chỉ sau khi guard xanh và operator
review kill switch mới chạy accelerated alert/correction flow với delivery được bật có kiểm soát.
Song song, hoàn tất Google/fresh-user onboarding, fault/reconciliation drill,
backup restore, accessibility matrix và baseline SLO dài hạn. Không đánh dấu provider/restore/SLO gate hoàn tất
bằng fake-provider hoặc config-only evidence.
Mỗi stage chỉ đóng khi exit criteria xanh và có bằng chứng trong repository/staging.
