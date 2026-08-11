# S4 staging evidence

Không điền trước kết quả. Không ghi secret, raw token, email/số điện thoại cá nhân hoặc URL public
có bearer token.

S4C personal pilot chỉ dùng các hàng artifact/push, contact acceptance và provider E2E cùng security/
hosted baseline đã pass. Fault/restore/full accessibility/SLO là S4D post-MVP hardening; không xóa hoặc
điền trước các hàng đó.

## Local repository readiness — 09/08/2026

Đây chỉ là bằng chứng trước staging, không đóng các hàng external bên dưới.

- Database reset từ trống và 150/150 pgTAP test: pass.
- S2 + S3 Edge/local smoke: pass; không gửi provider thật.
- Release recheck 11/08/2026: mobile 133/133 (38 suite), contact web 5/5, contracts 3/3,
  Edge/script 33/33 và database 150/150: pass.
- Lint/typecheck và mobile Android/iOS/web + contact web production export: pass.
- Browser root shell: 390/768/1440 không tràn ngang; Tab focus, một H1 và `lang=vi`: pass.
- Android device smoke onboarding → login: pass trên TECNO KJ7/Android 14; không có FATAL.
- Mobile login font 200% + external-keyboard focus order: pass; font đã restore 1.0, không có FATAL.
- Auth magic-link request tới consented test account: link-sent; callback và session restore pass.
- Expired-link callback regression: Supabase `sb` parameter được allow đúng; 12 deep-link tests pass.
- Auth email quota: lỗi `429` được tái hiện; sau quota reset, một link mới gửi thành công.
- Authenticated device smoke: profile timezone cập nhật sang `Asia/Ho_Chi_Minh`; deadline local-time,
  check-in thật và History pass; delivery vẫn `false`.
- TalkBack/full journey, web zoom 200% và token-state route matrix: chưa chạy đủ.
- Hosted project: `im-okay-staging`, Singapore, healthy; CLI login/link pass.
- Migration dry-run: 8 local migration pending, không seed; đã review trước apply.
- Backend deploy 09/08/2026: 8/8 remote migration khớp local; 5/5 Edge Functions `ACTIVE`.
- Hosted health: public `200`, internal ops `200`, API không JWT `401`.
- Hosted workers: ba Vault secret đã cấu hình; không ghi giá trị secret vào evidence.
- Notification delivery: đã bật trong cửa sổ supervised smoke cho invitation và một
  alert/correction cycle; đã trả về `false` sau smoke.
- Gmail SMTP readiness 10/08/2026 20:07 ICT: đủ ba tên Edge secret, dedicated sender và hai App
  Password tách biệt được operator xác nhận; guard pass mà không đọc giá trị hoặc đổi kill switch.
- Contact web: Vercel deployment `dpl_7su9H5GAA8Zbw7b8ytYCCNVho1xN`, alias
  `https://im-okay-contact-staging.vercel.app`; privacy headers và invalid-token route pass.
- Auth/CORS: Site URL + web/mobile redirect allowlist và exact web origin đã cấu hình.
- Non-mutating preflight 09/08/2026 08:58 UTC: pass; p50 `169 ms`, p95 `1604 ms`/10 samples.
- Guarded hosted security smoke: pass; hai synthetic `.test` users đã cleanup `2/2`, không gửi email.
- Observability snapshot 09/08/2026 11:22 UTC: pass; 30 health samples và aggregate ops projection.
- Hosted workers: bốn Cron active, recent runs succeeded, failure/queue/outbox/dead-letter đều `0`.
- Android test device: TECNO KJ7 được ADB nhận ở trạng thái `device`; Gmail SMTP đã cấu hình;
  test recipient/device đã được operator cho explicit consent; backup target còn chờ; notification
  delivery vẫn tắt.
- Gmail SMTP invitation 10/08/2026: `sent`, provider `gmail_smtp`, một attempt, không có error;
  contact đã chấp nhận ngày 11/08/2026. Evidence không lưu PII/raw token/provider ID.
- Push readiness: Android permission bật nhưng hosted `user_devices` là `0`. EAS snapshot
  `2a6cb1be-85c0-48d1-bc75-f0f97ff10842` đã `FINISHED` và cài trên TECNO KJ7; retry không tạo
  device. Audit APK này phát hiện thiếu FCM V1 credential và `google-services.json`. Source đã hiển thị
  push error bằng live region và đọc `android.googleServicesFile` từ EAS file variable
  `GOOGLE_SERVICES_JSON`; root gate xanh với 131 mobile test/37 suite, nhưng fix này chưa nằm
  trong APK đã cài.
- FCM follow-up 11/08/2026: exact build `61b9016f-3a3f-4087-aae3-b2be119d65f6` từ commit
  `659973f6b097053aa29b9f8f606b651f589bc30c` đã `FINISHED` và cài trên TECNO KJ7.
  SHA-256 `B98427AD9829F4756D4C82C3BDC57354F4866F2C4204AA0EE764472C5A41FF62`;
  app `0.1.0`/build `1`, session restore và launch không có FATAL/React Native error.
- Push/provider smoke 11/08/2026: Settings hiển thị đã bật/đăng ký; direct Expo ticket và
  receipt đều `ok` (receipt khoảng 8,9 giây). Accelerated scheduler delivery Expo có
  `delivered`, một attempt, không error.
- Full flow 11/08/2026: contact accepted; alert email Gmail SMTP `sent`; contact action
  `acknowledge`; check-in chuyển alert sang `cancelled`; correction Gmail SMTP `sent` và đã
  xuất hiện trong inbox. Mỗi template `user-reminder`, `trusted-contact-alert`, `alert-correction`
  có chính xác một delivery/một attempt, không error; chu kỳ mới `scheduled`.
- Token hygiene: smoke phát hiện listener của binary đăng ký thêm native FCM token. Hàng
  native đã disable, hàng Expo token vẫn enabled. Source fix convert native token qua
  `getExpoPushTokenAsync`; lint/typecheck và 133 test/38 suite pass. Fix chưa nằm trong APK này.
- Token-rotation candidate 11/08/2026: EAS Android staging build
  `3768ba65-ac54-47ad-b8d2-d23928d0cf15` từ exact commit
  `f1236d5cb78979ce49e9cfb55c888ee54ca4fca2` đã `FINISHED`, tải qua EAS cache và cài đè lúc
  14:33 ICT. APK SHA-256
  `7556B2BAC99A626A6C997F57D8EB49E781C89431AEF277E9AC12AEB0B7BE77F2`; session restore,
  authoritative check-in, History, Settings push registration và crash-log smoke đều pass.
  Sau refresh, aggregate scrubbed có `1` Expo token enabled, `0` native token enabled và `1`
  native row cũ disabled; `last_seen_at` cập nhật lúc `2026-08-11T07:36:25.134481Z`.
- Candidate font 200% recheck trên TECNO KJ7: Home vẫn hiển thị CTA `Tôi vẫn ổn`, ba tab điều hướng,
  deadline và last-check-in copy; không có FATAL. Font scale hệ thống đã restore từ `2.0` về `1.0`.
  TalkBack và full M01–M12 journey chưa được xác minh nên mobile accessibility vẫn `Partial`.
- Candidate TalkBack Home semantics smoke 11/08/2026: TalkBack service thực sự enabled/bound, cửa sổ
  accessibility focus là `I'm Okay`; UI tree có heading `Trang chủ`, CTA `Tôi vẫn ổn`, ba tab và
  `Mở trợ giúp khẩn cấp`, không có FATAL. Setting được restore về services `null`, accessibility/touch
  exploration `0/0`. Tutorial/TTS trên device ngăn xác minh spoken order và full journey, nên không
  nâng hàng accessibility thành Pass.
- S4D security recheck 11/08/2026 04:11 UTC: malformed JWT/actor binding/RLS cross-read và
  cross-update/restricted RPC-table đều pass; synthetic auth users cleanup `2/2`.
- S4D observability recheck 11/08/2026 04:11 UTC: 30 health samples, error `0/30`,
  average/p50/p95/max `179/169/296/300 ms`; scheduler heartbeat age `9 s`, Cron failures,
  queue, dead-letter và overdue đều `0`; outbox pending `5` khi delivery tắt.
- Plan 03 RC recheck 11/08/2026 07:44 UTC: hosted security smoke tiếp tục pass malformed JWT,
  actor binding, RLS/IDOR và restricted RPC/table; synthetic users cleanup `2/2`. Observability
  30 mẫu có error `0/30`, average/p50/p95/max `187/156/389/647 ms`; heartbeat age `12 s`, Cron
  failure/queue/dead-letter/overdue đều `0`; outbox pending `6` sau candidate check-in. Provider
  readiness đủ secret names và consent confirmations nhưng không bật delivery hoặc gọi provider.
- Hosted contact-web browser recheck 11/08/2026: 390/768/1440 px không overflow ngang, một H1,
  `lang=vi`, root link nhận Tab focus; invitation và alert token giả trả cùng generic invalid-link
  state, không render token và không có console warning/error. Browser zoom 200% và screen reader
  thật chưa được xác minh.
- Contact-web help source QA 11/08/2026: sửa root self-link thành `/help`; trang mới có safety
  limitation, private-link guidance và không yêu cầu credential/payment. Local browser accessibility
  tree có đúng một H1 + ba H2, keyboard focus rõ, link 48–50 px, không overflow ở 390/768/1440 và
  không có console warning/error; lint/typecheck/build + 5/5 test pass. Chưa deploy route mới nên
  staging direct-route/privacy-header recheck và screen reader/zoom thật vẫn pending.
- S4D local recovery drill: 150 pgTAP test pass, bao gồm function termination/lease reclaim,
  deliberately deleted queue message/reconciliation rebuild và provider transient/permanent/unknown.
- Local isolated restore rehearsal: pass integrity 16 public table và 8 migration record; dump loại
  `pg_cron`, restore bằng `supabase_admin`, database/dump tạm đã cleanup. Hosted backup list hiện
  trống và `pitr_enabled=false`, nên release backup gate vẫn mở.

## Environment

- Date/time: 11/08/2026 14:44 ICT (preflight/provider E2E trước đó; Plan 03 RC recheck 11/08)
- Commit SHA: current candidate exact commit
  `f1236d5cb78979ce49e9cfb55c888ee54ca4fca2`; repository HEAD có thêm release evidence/scripts
  nhưng `apps/mobile` khớp candidate.
- Supabase project ref/region/plan: `xnaanctveihyksgcveup` / Singapore / Free
- Migration versions: 8 version từ `20260804000100` đến `20260809000800`
- Edge function versions at latest read-only audit: `api` v9, `notification-consumer` v9;
  `public-api`, `provider-receipts`, `ops` v8
- Contact web build/domain: Vercel `dpl_7su9H5GAA8Zbw7b8ytYCCNVho1xN` / staging alias ở trên
- Mobile EAS project/build: `3ea9c673-0f86-4d5e-a802-53899da19dcb` / candidate
  `3768ba65-ac54-47ad-b8d2-d23928d0cf15` (`FINISHED`), commit
  `f1236d5cb78979ce49e9cfb55c888ee54ca4fca2`, Android staging/internal, app `0.1.0` build `1`;
  SHA-256 `7556B2BAC99A626A6C997F57D8EB49E781C89431AEF277E9AC12AEB0B7BE77F2`.
- Mobile device/OS: TECNO KJ7 / Android 14, API 34, arm64-v8a; ADB install/launch pass
- Test users/contacts consent reference: operator confirmation 10/08/2026; không ghi PII
- Operator và go/hold owner: project owner/operator; supervised personal-pilot window từ
  11/08/2026, delivery mặc định tắt ngoài cửa sổ do owner kiểm soát.

## Results

| Gate                                                | Result  | Sanitized evidence                                                              | Blocker/owner |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | ------------- |
| Backend deploy order                                | Pass    | 8 migration + 5 functions; delivery off                                         |               |
| Full preflight sau contact-web deploy               | Pass    | HTTPS/headers/CORS/auth/ops; 10 samples                                         |               |
| Auth/redirect/session restore                       | Pass    | Magic link mở app; session còn sau force-stop/mở lại trên TECNO KJ7             |               |
| Mobile scheduled-alert semantics                    | Pass    | 131 test; scheduled không hiện warning card/button; relaunch/logcat sạch        |               |
| Candidate token rotation/device smoke               | Pass    | Candidate cài; 1 Expo enabled, 0 native enabled; check-in/History; no FATAL     |               |
| Invitation → alert → response → correction          | Pass    | Accepted → acknowledged → check-in/cancelled → correction sent; no duplicate    |               |
| Expo ticket/receipt và Gmail SMTP delivery          | Pass    | Expo receipt ok; push delivered; alert/correction sent, one attempt each        |               |
| Duplicate/concurrent/offline/timeout                | Pass    | DB/Edge/mobile regression + single delivery per template                        |               |
| Function/queue/provider/reconciliation drills       | Partial | Local 150 pgTAP + Edge fake-provider recovery cases pass; hosted drill pending  | Operator      |
| RLS/IDOR/JWT/token/rate limit                       | Pass    | anon + 2 synthetic users; actor/IDOR/JWT/token/origin/rate negative matrix pass |               |
| Contact web 390/768/1440 + keyboard/SR/zoom         | Partial | Live token routes pass; local `/help` semantics pass; deploy/zoom/SR pending    | Device/SR     |
| Mobile TalkBack/VoiceOver/font/focus/reduced motion | Partial | Android login font 200% + focus pass; TalkBack/full journey pending             | Device/SR     |
| Sentry symbolication/PII scrub                      | Partial | Unit scrub pass; staging upload/config vẫn tắt                                  | Sentry setup  |
| Backup restore/integrity                            | Partial | Local isolated restore 16 tables/8 migrations pass; hosted backup/PITR absent   | Owner/plan    |
| Monitoring/dashboard/alerts                         | Partial | Current 30-sample health + Cron/ops healthy; alert/SLO series pending           | Operator      |
| Runbook/privacy/terms/support/incident              | Partial | Runbook + readiness docs có; owner/legal/contact/retention/SLA còn thiếu        | Product/owner |

## Measured baseline

- Edge health/API average/p50/p95/max/error rate: `187/156/389/647 ms`; 30 health samples;
  error rate `0/30` at 11/08/2026 07:44 UTC
- Cron interval/run failures: scheduler/consumer 1 phút, receipt 5 phút; failures last hour `0`
- Scheduler lag p50/p95/max: chưa đủ chuỗi đo; heartbeat age tại snapshot mới nhất `12 s`
- Queue depth/oldest age: `0/0 s`
- Delivery retry/dead-letter/unknown: `0/0/0`; outbox pending `6` sau candidate check-in
- Email accepted/received latency: correction backend `sent` sau khoảng 63 giây từ check-in;
  inbox receipt đã xác nhận.
- Expo ticket/receipt latency: direct transport receipt `ok` sau khoảng 8,9 giây; scheduled
  reminder persisted `delivered`.
- Reconciliation repair count/time: local deliberately deleted queue message được rebuild trong
  pgTAP drill; hosted count/time chưa đo.

## Decision

- Known limitations: token-rotation candidate đã qua artifact/device smoke; native-token row cũ
  vẫn disabled và Expo row vẫn enabled. Hosted backup/PITR, hosted fault drill, full accessibility,
  Sentry symbolication và baseline dài hạn chưa có.
- Personal-pilot blockers: không còn theo gate S4C; phải giám sát token/delivery theo runbook.
- Post-MVP hardening còn mở: hosted fault/reconciliation drill, hosted restore/PITR, full
  accessibility, Sentry symbolication và measured SLO.
- Go / hold / rollback: Go có điều kiện cho personal pilot một thiết bị/contact đã consent;
  delivery hiện `false` và chỉ owner được mở cửa sổ pilot. Hold/stop nếu Expo token bị
  disable, có missing/duplicate delivery hoặc không tắt được kill switch.
- Follow-up owner/date: project owner; cấu hình hosted backup/PITR, chạy hosted recovery drill,
  hoàn tất full accessibility/Sentry và measured monitoring trước khi mở internal alpha.
- Privacy/support follow-up: owner điền legal identity, support/privacy/incident contacts, retention
  và export/deletion SLA trong release readiness docs; gửi test ticket trước internal alpha.
