# S4 staging evidence

Không điền trước kết quả. Không ghi secret, raw token, email/số điện thoại cá nhân hoặc URL public
có bearer token.

## Local repository readiness — 09/08/2026

Đây chỉ là bằng chứng trước staging, không đóng các hàng external bên dưới.

- Database reset từ trống và 150/150 pgTAP test: pass.
- S2 + S3 Edge/local smoke: pass; không gửi provider thật.
- Mobile 109/109, contact web 4/4, contracts 3/3, Edge 26/26: pass.
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
- Notification delivery: đã bật có kiểm soát cho một invitation rồi tắt lại; chưa gửi alert/push thật.
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
  contact còn `pending` nên chưa chạy alert flow. Evidence chỉ giữ delivery hash đã scrub.
- Push readiness: Android permission bật nhưng hosted `user_devices` là `0`; Settings retry fix qua
  lint/typecheck và 128 test. EAS snapshot `2a6cb1be-85c0-48d1-bc75-f0f97ff10842` đang build.

## Environment

- Date/time: 10/08/2026 17:28 ICT (preflight 09/08; Gmail SMTP deploy/readiness audit 10/08)
- Commit SHA: base `13af8a468b89a0a101521f7a7daed281058ba52f`; callback-fix build dùng dirty
  snapshot nên không thay thế exact-commit RC gate.
- Supabase project ref/region/plan: `xnaanctveihyksgcveup` / Singapore / Free
- Migration versions: 8 version từ `20260804000100` đến `20260809000800`
- Edge function versions: `api` v4, `notification-consumer` v4; `public-api`, `provider-receipts`,
  `ops` v3
- Contact web build/domain: Vercel `dpl_7su9H5GAA8Zbw7b8ytYCCNVho1xN` / staging alias ở trên
- Mobile EAS project/build: `3ea9c673-0f86-4d5e-a802-53899da19dcb` /
  latest snapshot `ecb41bd6-1c40-4c54-84ab-ed0f015b80ea`; version `0.1.0` (`1`), signed internal APK;
  SHA-256 `CF42EE3A3853DF78210972680FBFF826BC82B93D9D4305ECFDDD883E3CF06615`
- Mobile device/OS: TECNO KJ7 / Android 14, API 34, arm64-v8a; ADB install/launch pass
- Test users/contacts consent reference: operator confirmation 10/08/2026; không ghi PII
- Operator và go/hold owner:

## Results

| Gate                                                | Result  | Sanitized evidence                                                                | Blocker/owner  |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------------------- | -------------- |
| Backend deploy order                                | Pass    | 8 migration + 5 functions; delivery off                                           |                |
| Full preflight sau contact-web deploy               | Pass    | HTTPS/headers/CORS/auth/ops; 10 samples                                           |                |
| Auth/redirect/session restore                       | Pass    | Magic link mở app; session còn sau force-stop/mở lại trên TECNO KJ7               |                |
| Mobile scheduled-alert semantics                    | Pass    | 128 test; scheduled không hiện warning card/button; relaunch/logcat sạch          |                |
| Invitation → alert → response → correction          |         |                                                                                   |                |
| Expo ticket/receipt và Gmail SMTP delivery          | Partial | Gmail invitation sent 1 attempt; push token/receipt và contact acceptance pending | Owner/operator |
| Duplicate/concurrent/offline/timeout                |         |                                                                                   |                |
| Function/queue/provider/reconciliation drills       |         |                                                                                   |                |
| RLS/IDOR/JWT/token/rate limit                       | Pass    | anon + 2 synthetic users; actor/IDOR/JWT/token/origin/rate negative matrix pass   |                |
| Contact web 390/768/1440 + keyboard/SR/zoom         | Partial | hosted invalid-token route pass; full matrix pending                              | Device/SR      |
| Mobile TalkBack/VoiceOver/font/focus/reduced motion | Partial | Android login font 200% + focus pass; TalkBack/full journey pending               | Device/SR      |
| Sentry symbolication/PII scrub                      |         |                                                                                   |                |
| Backup restore/integrity                            |         |                                                                                   |                |
| Monitoring/dashboard/alerts                         | Partial | 30-sample health + Cron/ops snapshot healthy; alert/SLO baseline pending          | Operator       |

## Measured baseline

- Edge health/API p50/p95/max/error rate: `161/258/790 ms`; 30 health samples; error rate `0/30`
- Cron interval/run failures: scheduler/consumer 1 phút, receipt 5 phút; failures last hour `0`
- Scheduler lag p50/p95/max: chưa đủ chuỗi đo; heartbeat age tại snapshot `40 s`
- Queue depth/oldest age: `0/0 s`
- Delivery retry/dead-letter/unknown: `0/0/0`
- Email accepted/received latency: backend `sent` sau khoảng 196 giây; inbox receipt chưa được xác nhận
- Expo ticket/receipt latency:
- Reconciliation repair count/time:

## Decision

- Known limitations: mới có Gmail invitation accepted; chưa có push receipt/full alert flow, restore,
  full accessibility hoặc baseline dài hạn
- Release blockers: contact acceptance, push token/receipt, full provider E2E, drills và restore còn thiếu
- Go / hold / rollback: Hold S4; delivery giữ `false`
- Follow-up owner/date:
