# I’m Okay — Supabase MVP implementation plan

## 1. Mục tiêu và phạm vi

Plan này là kế hoạch implementation đang hoạt động cho toàn bộ MVP còn thiếu:

- Supabase Auth, PostgreSQL, SQL migrations, RLS và authoritative RPC.
- Edge Function HTTP router cho mobile và public contact web.
- Responsive contact web W01–W05.
- Cron, Queues/outbox, retry và reconciliation.
- Expo Push, configurable email provider và alert escalation/correction.
- Local development, CI và personal-pilot staging acceptance; hardening rộng hơn theo release gate.

Mobile M01–M12 đã hoàn tất client; plan này chỉ nối remote contract và không làm
lại UI. Release/store/production gate thuộc [`03-RELEASE.md`](03-RELEASE.md).

Kiến trúc chi tiết và trade-off đã chốt trong
[`ADR 0008`](../adr/0008-supabase-first-backend.md). State machine, public-token và notification
workflow S3 được ghi tại [`ADR 0010`](../adr/0010-contact-alert-notification-workflows.md).
Gmail SMTP tạm thời cho personal pilot và đường nâng cấp verified-domain provider được ghi tại
[`ADR 0012`](../adr/0012-temporary-gmail-smtp-personal-pilot.md).

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
                           |-- Gmail SMTP tạm thời / Resend EmailProvider
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

### S4 — Personal-pilot staging acceptance

Mục tiêu: đưa owner và test contact đã consent vào một pilot có giám sát sớm nhất mà không nới
lỏng authoritative scheduling, authorization, idempotency hoặc notification safety. Các drill/SLO/
restore và device matrix rộng hơn được giữ lại nhưng không chặn personal pilot.

#### S4A — Repository readiness

- [x] Implement distributed rate limit cho authenticated/public mutation, chỉ lưu SHA-256 subject.
- [x] Thêm notification kill switch fail-closed ở live và provider HTTP timeout.
- [x] Thêm Vault-backed hosted Cron invocation, rate-limit cleanup và aggregate `ops` projection.
- [x] Thêm guarded deploy dry-run/apply script, non-mutating preflight và staging env examples.
- [x] Viết ADR, staging operations runbook và evidence template.
- [x] Reset database từ trống; chạy 150 pgTAP, S2/S3 smoke, 26 Edge và 109 mobile test.
- [x] Build Android/iOS/web và kiểm tra contact web nền ở 390/768/1440 px + keyboard focus.
- [x] Thêm provider selection, Gmail SMTP personal-pilot adapter và giữ Resend upgrade path.

#### S4B — Hosted baseline

- [x] Tạo Supabase project `im-okay-staging` tại Singapore và xác minh CLI login/project healthy.
- [x] Link repository đúng staging project và review dry-run: 8 migration pending, không seed.
- [x] Cấu hình internal/rate-limit secrets, ba Vault secret cho hosted workers và giữ delivery off.
- [x] Apply 8 expand migration và deploy 5 backward-compatible Edge Functions.
- [x] Deploy contact-web HTTPS staging và cấu hình Auth site URL/redirect tách production.
- [x] Cấu hình exact public CORS/link URL và chạy non-mutating hosted preflight với delivery off.
- [x] Cấu hình Gmail SMTP bằng dedicated account và hai App Password tách biệt; provider-readiness
      xác nhận đủ tên Edge secret, không đọc giá trị.
- [x] Ghi explicit consent cho test alert recipient/device trước khi bật delivery.
- [x] Tạo EAS project/environment, cấp publishable key và chạy mobile staging build trên thiết bị.
- [x] Đo snapshot Edge Function error/latency, cron run, queue age/depth/retry/dead-letter.
- [x] Xác minh hosted RLS/IDOR/rate-limit/public-token negative cases và PII scrub.

#### S4C — Personal-pilot acceptance — hoàn tất 11/08/2026

- [x] Cấu hình Firebase Android app chỉ làm FCM transport, EAS secret file
      `GOOGLE_SERVICES_JSON` và FCM V1 credential; không thêm Firebase Auth/data/functions.
- [x] Submit Android build exact commit `659973f6b097053aa29b9f8f606b651f589bc30c`; build
      `61b9016f-3a3f-4087-aae3-b2be119d65f6` đã `FINISHED` và cài ngày 11/08/2026.
- [x] Cài artifact trên TECNO KJ7 và xác minh Expo token → ticket → receipt.
- [x] Test contact đã consent đã chấp nhận invitation đã gửi.
- [x] Chạy đúng một accelerated alert → email/push → contact response → correction/check-in;
      xác minh không missing/duplicate và tắt delivery ngay sau smoke.

Exact artifact đã qua provider E2E nên không dùng email-only fallback. Known limitation của binary:
native token-rotation callback có thể đăng ký thêm FCM token không hợp lệ với Expo. Hàng đó
đã bị disable, Expo token hợp lệ vẫn enabled; source fix và regression test đã có nhưng phải
đi vào build kế tiếp trước khi mở rộng ngoài personal pilot.

#### S4D — Post-MVP release hardening — gate tiếp theo, không chặn personal pilot

- [ ] Tích lũy scheduler lag p50/p95/max và chốt alert threshold từ chuỗi đo staging.
- [ ] Chạy function termination, queue loss/lease expiry, provider outage và reconciliation drill.
- [ ] Cấu hình backup/PITR theo plan và thực hiện restore sang isolated environment.
- [ ] Chạy Google/fresh-user, phần còn lại của mobile remote gates và contact-web token routes,
      keyboard/screen-reader/zoom 200%.
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
  device confirmation, không in secret value và không mutate delivery. Gmail SMTP adapter dùng TLS,
  deterministic Message-ID/hash, timeout và outcome classification; Resend adapter vẫn còn cho đường
  nâng cấp. Tổng 33 Edge/guard test và typecheck pass.
- Staging đã đặt `EMAIL_PROVIDER=gmail_smtp`, giữ `NOTIFICATION_DELIVERY_ENABLED=false` rồi deploy
  `api`/`notification-consumer` v4; Supabase bundler nhận Nodemailer, public health `200`, API không JWT
  `401`.
- Ngày 10/08/2026, đủ ba Edge secret `GMAIL_SMTP_USERNAME`/`GMAIL_SMTP_APP_PASSWORD`/
  `GMAIL_SMTP_FROM`; `staging:provider-readiness` xanh và TECNO KJ7 được ADB nhận ở trạng thái `device`.
  Guard không đọc giá trị secret và không đổi kill switch.
- Operator đã cho explicit consent cho đúng test recipient/device. Invitation delivery thật được tạo khi
  kill switch tắt, sau đó bật có kiểm soát và Gmail SMTP ghi `sent` đúng một attempt, không có lỗi;
  kill switch đã tắt lại trong lúc chờ contact chấp nhận. Không ghi email, raw token hoặc provider ID vào
  evidence.
- Smoke phát hiện Android permission đã bật nhưng staging account chưa có Expo token (`0` device).
  Settings đã bổ sung retry đăng ký và chỉ báo thành công sau server projection `registered`.
  EAS snapshot `2a6cb1be-85c0-48d1-bc75-f0f97ff10842` đã `FINISHED`; APK SHA-256
  `E52AA620AFE2AB239EF81ED3442B3E368101D4752BEE416C78235554173F731C` đã cài trên TECNO KJ7,
  giữ session và không có FATAL/React error. Thử retry vẫn giữ hosted `user_devices=0`.
- Audit config xác nhận APK trên chưa có `google-services.json` và chưa có FCM V1 credential
  evidence cho EAS. Source đã thêm dynamic Expo config đọc `android.googleServicesFile` từ EAS
  file variable `GOOGLE_SERVICES_JSON`, giữ file/key ngoài Git. Credential/file variable thật vẫn là
  blocker tại thời điểm audit APK đó; không bật delivery trước khi hoàn tất config và token smoke.
- Source đã sửa việc push-registration error bị ẩn, thêm assertive error card và regression test.
  Root format/lint/typecheck/test/build gate xanh; mobile có 131 test/37 suite. Fix feedback/config này chưa
  nằm trong APK vừa cài và cần build lại sau khi cấu hình FCM.
- Local stack đã dựng lại từ 8 migration và seed; 150/150 pgTAP, S2 smoke và S3 smoke đều
  xanh. Do `supabase db reset --local` gặp `uv_spawn` trên Windows với path workspace này,
  `supabase:reset`/`test:integration` nay recreate stack bằng `stop --no-backup` → `start`, giữ đúng
  fresh-migration semantics và chạy được bằng lệnh chuẩn trong repository.
- Tại lần audit này contact acceptance và push/provider flow còn mở; chúng đã được đóng
  bằng evidence 11/08/2026 bên dưới. Google/fresh-user, full accessibility, fault/reconciliation
  drill, SLO dài hạn và backup restore vẫn thuộc S4D.
- Sau audit trên, Firebase project/Android app chỉ dành cho FCM transport đã được cấu hình; EAS Preview
  có secret file `GOOGLE_SERVICES_JSON` và FCM V1 credential đã gán cho `com.imokay.app`. Android build
  `61b9016f-3a3f-4087-aae3-b2be119d65f6` từ exact commit
  `659973f6b097053aa29b9f8f606b651f589bc30c` đã `FINISHED`, cài trên TECNO KJ7 với
  SHA-256 `B98427AD9829F4756D4C82C3BDC57354F4866F2C4204AA0EE764472C5A41FF62`.
- Provider smoke 11/08/2026: Settings đăng ký được Expo token; direct Expo ticket và receipt
  đều `ok`. Accelerated cycle tạo chính xác một `user-reminder` Expo `delivered`, một
  `trusted-contact-alert` Gmail SMTP `sent` và một `alert-correction` Gmail SMTP `sent`;
  mỗi delivery một attempt, không error. Contact invitation/acknowledgement đã được Supabase
  ghi nhận; check-in chuyển alert cũ sang `cancelled`, correction sang `sent` và tạo chu kỳ
  `scheduled` mới. Correction email có trong inbox; kill switch đã trả về `false`.
- Smoke phát hiện binary đăng ký cả native FCM token khi listener chạy. Hàng native đã
  disable, Expo token vẫn enabled. Source đã chuyển `DevicePushToken` qua
  `getExpoPushTokenAsync`; lint/typecheck và 133 mobile test/38 suite xanh. Fix chưa nằm trong
  exact artifact và được ghi là giới hạn của personal pilot hiện tại.

Personal-pilot exit:

- Không còn check-in false success, duplicate/missing alert hoặc authorization/token blocker.
- Authoritative Cron/queue/check-in vẫn khỏe trên hosted staging.
- Một alert/contact-response/correction cycle thật có evidence với test contact đã consent.
- Delivery được tắt lại sau smoke; known limitation được ghi rõ trước khi owner bắt đầu pilot.

Post-MVP hardening exit trước internal alpha/beta:

- Full alert/correction/recovery và fault/reconciliation drill có evidence trên staging.
- Backup đã restore thật; operator phát hiện được overdue work và provider failure.
- Accessibility/device matrix và measured SLO/runbook gate trong Plan 03 đã xanh.

## 7. Kiểm thử bắt buộc theo gate

Personal-pilot gate yêu cầu:

- Database: migration từ empty DB, constraints, RLS auth/anon/internal matrix, transaction rollback.
- Domain: 24/36/48, timezone/DST, state transition, snooze expiry, SOS/drill/correction.
- Integration: Edge API→DB/outbox→queue→consumer→fake provider.
- Concurrency: check-in, invitation response, alert response, scheduler/consumer claim.
- Provider E2E: một invitation/alert/contact-response/correction cycle thật với consent và kill switch.
- Security: hosted JWT/RLS/IDOR/public-token/rate-limit matrix và token/PII scrub.

Post-MVP hardening trước internal alpha/beta yêu cầu thêm:

- Recovery: function termination, queue loss/lease expiry, provider timeout/unknown và restore.
- Client/E2E: toàn bộ onboarding, check-in, invitation, escalation, SOS/drill, history/settings journeys.
- Accessibility: screen reader, keyboard/zoom, reduced motion và device/browser matrix đầy đủ.

Dùng fake clock và fake providers mặc định. Provider smoke thật chỉ chạy trên staging
với explicit flag và test recipient đã consent.

## 8. Definition of Done

Supabase personal-pilot MVP hoàn thành khi:

- S1–S3, S4A, S4B và personal-pilot exit của S4C có automated test hoặc external evidence phù hợp.
- App đóng vẫn có server-side scheduling; PostgreSQL dựng lại được missing queue work.
- Mutation nhạy cảm có auth/RLS, transaction, idempotency, audit và outbox.
- Provider side effect có timeout, retry classification, stable delivery key và reconciliation.
- Public token/PII/secret không lọt qua client, log, Sentry, referrer, cache hoặc artifact.
- Owner/test contact đã consent, hiểu đây không phải dịch vụ cứu hộ và biết known limitations.
- Android artifact đã qua push+email E2E, hoặc owner chủ động chọn email-only supervised fallback.

S4D, full accessibility/device matrix, restore, measured SLO và internal/store rollout tiếp tục là
release-hardening DoD trong [`03-RELEASE.md`](03-RELEASE.md), không phải blocker của personal pilot.

## 9. Bước tiếp theo

S1–S3 và S4A–S4C đã hoàn tất; personal-pilot MVP có thể vận hành có giám sát.
Giữ kill switch tắt ngoài cửa sổ pilot do owner kiểm soát, theo dõi token enabled và đưa
token-rotation fix vào build kế tiếp. Google/fresh-user, fault/reconciliation drill, backup restore,
full accessibility matrix, measured SLO, iOS và store chuyển sang S4D/Plan 03.
