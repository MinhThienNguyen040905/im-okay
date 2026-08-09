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
- Zoom 200%, screen reader, token-state route matrix, thiết bị thật: chưa chạy.
- Hosted project: `im-okay-staging`, Singapore, healthy; CLI login/link pass.
- Migration dry-run: 8 local migration pending, không seed; đã review trước apply.
- Backend deploy 09/08/2026: 8/8 remote migration khớp local; 5/5 Edge Functions `ACTIVE`.
- Hosted health: public `200`, internal ops `200`, API không JWT `401`.
- Hosted workers: ba Vault secret đã cấu hình; không ghi giá trị secret vào evidence.
- Notification delivery: tắt; chưa gọi email/push provider thật.
- Domain/Resend/test device/backup target: chưa cấu hình.

## Environment

- Date/time:
- Commit SHA:
- Supabase project ref/region/plan:
- Migration versions:
- Edge function versions:
- Contact web build/domain:
- Mobile EAS build ID/device/OS:
- Test users/contacts consent reference:
- Operator và go/hold owner:

## Results

| Gate                                                | Result | Sanitized evidence                      | Blocker/owner |
| --------------------------------------------------- | ------ | --------------------------------------- | ------------- |
| Backend deploy order                                | Pass   | 8 migration + 5 functions; delivery off |               |
| Full preflight sau contact-web deploy               |        |                                         |               |
| Auth/redirect/session restore                       |        |                                         |               |
| Invitation → alert → response → correction          |        |                                         |               |
| Expo ticket/receipt và Resend delivery              |        |                                         |               |
| Duplicate/concurrent/offline/timeout                |        |                                         |               |
| Function/queue/provider/reconciliation drills       |        |                                         |               |
| RLS/IDOR/JWT/token/rate limit                       |        |                                         |               |
| Contact web 390/768/1440 + keyboard/SR/zoom         |        |                                         |               |
| Mobile TalkBack/VoiceOver/font/focus/reduced motion |        |                                         |               |
| Sentry symbolication/PII scrub                      |        |                                         |               |
| Backup restore/integrity                            |        |                                         |               |
| Monitoring/dashboard/alerts                         |        |                                         |               |

## Measured baseline

- Edge health/API p50/p95/error rate:
- Cron interval/run failures:
- Scheduler lag p50/p95/max:
- Queue depth/oldest age:
- Delivery retry/dead-letter/unknown:
- Email accepted/received latency:
- Expo ticket/receipt latency:
- Reconciliation repair count/time:

## Decision

- Known limitations:
- Release blockers:
- Go / hold / rollback:
- Follow-up owner/date:
