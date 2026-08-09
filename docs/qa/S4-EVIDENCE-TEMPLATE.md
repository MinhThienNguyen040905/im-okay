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
- Zoom 200%, screen reader và token-state route matrix: chưa chạy đủ.
- Hosted project: `im-okay-staging`, Singapore, healthy; CLI login/link pass.
- Migration dry-run: 8 local migration pending, không seed; đã review trước apply.
- Backend deploy 09/08/2026: 8/8 remote migration khớp local; 5/5 Edge Functions `ACTIVE`.
- Hosted health: public `200`, internal ops `200`, API không JWT `401`.
- Hosted workers: ba Vault secret đã cấu hình; không ghi giá trị secret vào evidence.
- Notification delivery: tắt; chưa gọi email/push provider thật.
- Contact web: Vercel deployment `dpl_7su9H5GAA8Zbw7b8ytYCCNVho1xN`, alias
  `https://im-okay-contact-staging.vercel.app`; privacy headers và invalid-token route pass.
- Auth/CORS: Site URL + web/mobile redirect allowlist và exact web origin đã cấu hình.
- Non-mutating preflight 09/08/2026 08:58 UTC: pass; p50 `169 ms`, p95 `1604 ms`/10 samples.
- Hosted workers: bốn Cron active, recent runs succeeded, failure/queue/outbox/dead-letter đều `0`.
- Android test device: đã có; Resend/consented recipients/backup target: chưa cấu hình;
  notification delivery vẫn tắt.

## Environment

- Date/time: 09/08/2026 17:50 ICT (preflight 08:58 UTC; mobile smoke 10:50 UTC)
- Commit SHA: base `32fbcf93c1d28dd7a13b62e73107e4f28ec90ac9`; EAS/app config cần commit
  thật trong repository trước RC. Build hiện tại dùng clean snapshot tạm, không thay thế RC SHA.
- Supabase project ref/region/plan: `xnaanctveihyksgcveup` / Singapore / Free
- Migration versions: 8 version từ `20260804000100` đến `20260809000800`
- Edge function versions: `api`, `public-api`, `notification-consumer`, `provider-receipts`, `ops` v1
- Contact web build/domain: Vercel `dpl_7su9H5GAA8Zbw7b8ytYCCNVho1xN` / staging alias ở trên
- Mobile EAS project/build: `3ea9c673-0f86-4d5e-a802-53899da19dcb` /
  `be78049b-0f7e-4bee-a7f4-c18637d00b65`; version `0.1.0` (`1`), signed internal APK
- Mobile device/OS: TECNO KJ7 / Android 14, API 34, arm64-v8a; ADB install/launch pass
- Test users/contacts consent reference:
- Operator và go/hold owner:

## Results

| Gate                                                | Result  | Sanitized evidence                                                              | Blocker/owner |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------- | ------------- |
| Backend deploy order                                | Pass    | 8 migration + 5 functions; delivery off                                         |               |
| Full preflight sau contact-web deploy               | Pass    | HTTPS/headers/CORS/auth/ops; 10 samples                                         |               |
| Auth/redirect/session restore                       | Partial | Site URL + 2 redirects; onboarding/login UI pass; authenticated session pending | Test account  |
| Invitation → alert → response → correction          |         |                                                                                 |               |
| Expo ticket/receipt và Resend delivery              |         |                                                                                 |               |
| Duplicate/concurrent/offline/timeout                |         |                                                                                 |               |
| Function/queue/provider/reconciliation drills       |         |                                                                                 |               |
| RLS/IDOR/JWT/token/rate limit                       | Partial | anon/RLS/token/origin/rate pass; IDOR/JWT pending                               | Test users    |
| Contact web 390/768/1440 + keyboard/SR/zoom         | Partial | hosted invalid-token route pass; full matrix pending                            | Device/SR     |
| Mobile TalkBack/VoiceOver/font/focus/reduced motion | Partial | Android visual/navigation smoke pass; accessibility matrix pending              | Device/SR     |
| Sentry symbolication/PII scrub                      |         |                                                                                 |               |
| Backup restore/integrity                            |         |                                                                                 |               |
| Monitoring/dashboard/alerts                         | Partial | Cron/ops snapshot healthy; alert thresholds pending                             | Operator      |

## Measured baseline

- Edge health/API p50/p95/error rate: `169/1604 ms`; 10 health samples; error rate 0/10
- Cron interval/run failures: scheduler/consumer 1 phút, receipt 5 phút; failures last hour `0`
- Scheduler lag p50/p95/max: chưa đủ chuỗi đo; heartbeat age tại preflight `18 s`
- Queue depth/oldest age: `0/0 s`
- Delivery retry/dead-letter/unknown: `0/0/0`
- Email accepted/received latency:
- Expo ticket/receipt latency:
- Reconciliation repair count/time:

## Decision

- Known limitations: chưa có provider/restore/full accessibility hoặc baseline dài hạn
- Release blockers: consented recipient/Resend, authenticated E2E, drills và restore còn thiếu
- Go / hold / rollback: Hold S4; delivery giữ `false`
- Follow-up owner/date:
