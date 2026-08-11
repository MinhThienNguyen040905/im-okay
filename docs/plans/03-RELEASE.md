# I’m Okay — Quality, security and release plan

## 1. Vai trò của plan

Plan này là checklist phát hành, không phải một chuỗi milestone song song với roadmap.
Quality/security được thực hiện trong từng stage S1–S4 của
[`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md); file này chỉ quyết định khi nào được mở
personal pilot, internal testing, beta và production. Personal pilot là Android-first, owner-supervised
với test contact đã consent; nó không đồng nghĩa release candidate hoặc store rollout.

Plan 01 và Plan 02 đã hoàn tất baseline MVP. Từ ngày 11/08/2026, mọi công việc release đang mở
được quản lý tại Plan 03; các nhãn S4D trong tài liệu cũ chỉ còn là tham chiếu evidence.

Runbook thao tác mobile chi tiết:
[`MOBILE-RELEASE-RUNBOOK.md`](../release/MOBILE-RELEASE-RUNBOOK.md). Device/accessibility
matrix: [`MOBILE-MA7-MATRIX.md`](../qa/MOBILE-MA7-MATRIX.md).
Privacy/terms readiness và support/incident runbook:
[`PRIVACY-TERMS-READINESS.md`](../release/PRIVACY-TERMS-READINESS.md),
[`SUPPORT-INCIDENT-RUNBOOK.md`](../release/SUPPORT-INCIDENT-RUNBOOK.md).

## 2. Continuous quality gate

Mỗi feature/migration/function thay đổi phải có:

- [ ] Acceptance criteria, authorization rule và negative/error cases.
- [ ] Format, lint, typecheck và test liên quan xanh.
- [ ] Migration/RLS/constraint/contract drift check khi chạm backend.
- [ ] Regression test cho bug deadline, alert, idempotency hoặc public token.
- [ ] Fake clock/provider trong test mặc định; không gửi thật trong PR CI.
- [ ] Log/Sentry scrub token, authorization header, email body và PII không cần thiết.
- [ ] Loading/empty/error/offline/disabled và accessibility state phù hợp.

Không merge known check-in false success, duplicate/missing alert, data-loss hoặc
authorization/token bypass.

## 3. Personal-pilot MVP gate — đạt 11/08/2026

- [x] S1–S3, S4A/S4B hosted baseline, Cron/queue và security negative matrix xanh.
- [x] Android signed build/device auth/check-in/history smoke đã có.
- [x] Gmail SMTP invitation gửi đúng một attempt; delivery kill switch đã tắt lại.
- [x] Android FCM transport, EAS secret file và FCM V1 credential đã cấu hình; exact-commit build
      `61b9016f-3a3f-4087-aae3-b2be119d65f6` đã `FINISHED` và cài trên TECNO KJ7.
- [x] Cài artifact hiện tại và xác minh Expo token → ticket → receipt trên TECNO KJ7.
- [x] Test contact đã consent chấp nhận invitation.
- [x] Chạy đúng một accelerated alert → contact response → correction/check-in bằng provider thật;
      xác minh không missing/duplicate và tắt delivery sau smoke.
- [x] Ghi known limitations và owner/operator chịu trách nhiệm go/hold/stop cho cửa sổ
      personal pilot có giám sát từ 11/08/2026.

Owner có thể bắt đầu personal pilot có giám sát; không cần chờ iOS, store submission,
full device/accessibility matrix, restore drill hoặc SLO dài hạn. Delivery mặc định vẫn tắt
ngoài cửa sổ do owner chủ động mở theo runbook. Binary personal-pilot ban đầu có known limitation
với native token rotation; invalid token đã disable và Expo token hợp lệ vẫn enabled. Candidate
thay thế `3768ba65-ac54-47ad-b8d2-d23928d0cf15` từ commit
`f1236d5cb78979ce49e9cfb55c888ee54ca4fca2` đã `FINISHED`, cài đè và device smoke pass ngày
11/08/2026. Candidate không tạo native token mới; một Expo token vẫn enabled và native token cũ
vẫn disabled.

## 4. Staging release candidate gate — đang thực hiện

Đây là gate active của Plan 03. Chỉ đóng khi toàn bộ checkbox bên dưới có evidence phù hợp:

- [x] Android candidate chứa token-rotation fix đã `FINISHED`, cài trên TECNO KJ7 và pass
      session restore, authoritative check-in, History, Settings push registration cùng crash-log smoke.
- [x] Release preflight hiện tại xanh: format, lint, typecheck, contracts 3/3, contact web 4/4,
      mobile 133/133, Edge/script 33/33, database 150/150, S2/S3 smoke, client builds và
      `expo-doctor` 20/20.
- [ ] Full mobile/contact-web critical journeys xanh trên staging gần production.
- [x] Accelerated 36-hour-equivalent alert flow chạy với test recipients đã consent.
- [x] Check-in concurrent/idempotent/offline/timeout và correction sau notification được test.
- [ ] Function termination, queue loss/lease expiry, provider timeout/unknown và reconciliation
      được diễn tập.
  - [x] Local pgTAP/Edge fake-provider drill bao phủ termination/lease reclaim, queue loss/rebuild,
        transient/permanent/unknown và idempotency.
  - [ ] Hosted drill bằng harness test-scoped trên synthetic data, sau khi operator chứng minh
        delivery đang tắt; không fault-inject qua work thật.
- [x] RLS/IDOR/JWT/public-token/rate-limit negative tests xanh.
- [x] Public web đạt CSP/CORS/no-referrer/no-store/noindex và không rò token qua URL/log/cache.
- [ ] Mobile đạt VoiceOver/TalkBack, font 200%, focus và reduced-motion device matrix.
  - [x] TECNO KJ7/Android 14 candidate pass font 200%, Home TalkBack semantics và no-crash smoke.
  - [ ] TalkBack spoken order/full M01–M12, Android matrix còn lại và VoiceOver/iOS.
- [ ] Contact web đạt 390/768/1440 px, keyboard-only, screen reader và zoom 200%.
  - [x] Live 390/768/1440 px, root Tab focus và invalid-token privacy state.
  - [ ] Screen reader thật và browser zoom 200%.
- [ ] Sentry source maps/symbolication hoạt động và event không chứa PII/token.
- [ ] Database backup đã restore sang isolated environment và kiểm tra integrity.
- [ ] Dashboard/alert theo dõi function error, cron/scheduler lag, queue age, overdue action,
      reconciliation và provider failure.
- [ ] Runbook, known limitations, privacy/terms/support và incident contact đã sẵn sàng.
  - [x] Mobile/staging operations và support/incident runbook đã có stop/rollback criteria.
  - [x] Privacy/terms readiness đã khóa safety notice, data/provider inventory và publish gate.
  - [ ] Owner/legal identity, support/privacy/incident contacts, retention/export/deletion SLA và
        test ticket đã được điền/xác minh.

Tiến độ 11/08/2026: candidate SHA-256
`7556B2BAC99A626A6C997F57D8EB49E781C89431AEF277E9AC12AEB0B7BE77F2` đã cài lúc 14:33 ICT,
giữ session và không có FATAL. Check-in tạo projection mới, History hiển thị bản ghi; Settings cập nhật
`last_seen_at` và aggregate scrubbed giữ đúng một Expo token enabled, không có native token enabled.
Hosted security smoke mới pass và cleanup synthetic users `2/2`. Snapshot 30 mẫu lúc 07:44 UTC có
error `0/30`, p50/p95 `156/389 ms`, heartbeat age `12 s`, Cron/queue/dead-letter/overdue bằng `0`;
outbox pending `6` sau check-in khi delivery không được bật trong lần kiểm tra. Contact web live không
overflow ở 390/768/1440 px, Tab focus đúng và hai invalid-token route không render token; zoom 200%
và screen reader thật vẫn mở. Candidate trên TECNO KJ7 giữ CTA check-in cùng ba tab điều hướng ở
font hệ thống 200%, không crash và font scale đã restore `1.0`. TalkBack service đã bind vào candidate,
Home expose heading/CTA/navigation/help semantics và không crash; setting đã restore, nhưng tutorial/TTS
không cho xác minh spoken order/full journey nên gate vẫn mở. Không
nâng local rehearsal thành release pass: hosted fault drill còn thiếu, staging Free không có physical
backup/PITR, Sentry staging vẫn tắt upload, và full accessibility/SLO dài hạn vẫn mở.

Bộ privacy/terms readiness và support/incident runbook đã có, bao gồm safety limitation, data/provider
inventory, severity/stop/rollback và intake không thu secret/token. Gate artifact vẫn `Partial` cho đến
khi owner điền legal identity, support/privacy/incident contacts, retention/export/deletion SLA và
xác minh kênh public/private thật.

## 5. Internal alpha gate

- [ ] Tạo Android/iOS internal build đã ký từ exact commit SHA.
- [ ] Ghi EAS build ID, app version/build number, Supabase migration/function version.
- [ ] Upload Google Play Internal Testing và TestFlight; chưa mở production rollout.
- [ ] Tester chỉ dùng tài khoản/contact test đã được thông báo và consent.
- [ ] Chạy onboarding→check-in→restart, invitation, alert/correction và SOS/drill smoke.
- [ ] Theo dõi crash, check-in failure, scheduler/queue/delivery và false-alert/copy confusion.
- [ ] Có người quyết định go/hold/rollback và support/incident channel hoạt động.

## 6. Closed beta gate

- [ ] Nhóm beta nhỏ có consent và hiểu I’m Okay không phải dịch vụ cứu hộ.
- [ ] Reliability threshold được chốt từ staging/alpha data, không bịa trước.
- [ ] Theo dõi acknowledgement/resolution time, false-alert/correction và provider reliability.
- [ ] Incident drill, provider kill switch, queue backlog và support workflow được xác minh.
- [ ] Không có sự cố mất alert, duplicate alert hoặc authorization leak do lỗi đã biết.

## 7. Production gate

- [ ] Production Supabase project, domain, sender, secret và store credential tách staging.
- [ ] Pre-launch secret rotation, migration rehearsal và backup checkpoint hoàn tất.
- [ ] Privacy policy, terms, safety limitation, support contact và store material hoàn tất.
- [ ] Monitoring/dashboard/alerts và incident owner đang hoạt động.
- [ ] Staged rollout có go/hold/rollback criteria và provider kill switch có audit.
- [ ] Deploy order tương thích: expand migration → functions → contact web/mobile → cleanup sau.
- [ ] Daily review giai đoạn đầu và incident communication process đã có owner.

## 8. Blockers

### Personal-pilot blockers

- Check-in hiển thị thành công giả hoặc authoritative Cron/deadline không hoạt động.
- Invitation/alert email tới test contact không chạy thật hoặc tạo missing/duplicate alert.
- IDOR, JWT/RLS/public-token bypass, service-role/secret/PII leak.
- Không thể tắt delivery hoặc không có owner giám sát/go-hold-stop.
- Test contact chưa consent hoặc copy khiến họ hiểu đây là dịch vụ cứu hộ/y tế.

Android push token/receipt là blocker mặc định. Owner chỉ có thể tạm waive cho email-only supervised
pilot theo known limitation ở gate 3; không được waive alert email tới contact.

### Internal alpha/beta/production blockers

- Sai/mất/duplicate alert hoặc check-in false success.
- IDOR, JWT/RLS/public-token bypass, service-role/secret/PII leak.
- Queue loss/lease expiry không reconciliation được missing work.
- Cron/Edge Function/provider failure không có monitoring và runbook.
- SOS accidental send hoặc drill bị nhầm là alert thật.
- Critical flow không dùng được với screen reader/keyboard/font scaling.
- Backup chưa từng restore thành công.
- Copy hứa hẹn cứu hộ/y tế vượt quá khả năng hệ thống.

## 9. Definition of Done

Một release stage chỉ hoàn thành khi checklist tương ứng có evidence, known limitations
được ghi rõ và không còn blocker. Cấu hình/build artifact không tự động là bằng
chứng đã test, deploy hoặc rollout.
