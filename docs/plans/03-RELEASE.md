# I’m Okay — Quality, security and release plan

## 1. Vai trò của plan

Plan này là checklist phát hành, không phải một chuỗi milestone song song với roadmap.
Quality/security được thực hiện trong từng stage S1–S4 của
[`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md); file này chỉ quyết định khi nào được mở
internal testing, beta và production.

Runbook thao tác mobile chi tiết:
[`MOBILE-RELEASE-RUNBOOK.md`](../release/MOBILE-RELEASE-RUNBOOK.md). Device/accessibility
matrix: [`MOBILE-MA7-MATRIX.md`](../qa/MOBILE-MA7-MATRIX.md).

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

## 3. Staging release candidate gate

Chỉ đóng gate này sau S4:

- [ ] Full mobile/contact-web critical journeys xanh trên staging gần production.
- [ ] Accelerated 36-hour-equivalent alert flow chạy với test recipients đã consent.
- [ ] Check-in concurrent/idempotent/offline/timeout và correction sau notification được test.
- [ ] Function termination, queue loss/lease expiry, provider timeout/unknown và reconciliation
      được diễn tập.
- [ ] RLS/IDOR/JWT/public-token/rate-limit negative tests xanh.
- [ ] Public web đạt CSP/CORS/no-referrer/no-store/noindex và không rò token qua URL/log/cache.
- [ ] Mobile đạt VoiceOver/TalkBack, font 200%, focus và reduced-motion device matrix.
- [ ] Contact web đạt 390/768/1440 px, keyboard-only, screen reader và zoom 200%.
- [ ] Sentry source maps/symbolication hoạt động và event không chứa PII/token.
- [ ] Database backup đã restore sang isolated environment và kiểm tra integrity.
- [ ] Dashboard/alert theo dõi function error, cron/scheduler lag, queue age, overdue action,
      reconciliation và provider failure.
- [ ] Runbook, known limitations, privacy/terms/support và incident contact đã sẵn sàng.

## 4. Internal alpha gate

- [ ] Tạo Android/iOS internal build đã ký từ exact commit SHA.
- [ ] Ghi EAS build ID, app version/build number, Supabase migration/function version.
- [ ] Upload Google Play Internal Testing và TestFlight; chưa mở production rollout.
- [ ] Tester chỉ dùng tài khoản/contact test đã được thông báo và consent.
- [ ] Chạy onboarding→check-in→restart, invitation, alert/correction và SOS/drill smoke.
- [ ] Theo dõi crash, check-in failure, scheduler/queue/delivery và false-alert/copy confusion.
- [ ] Có người quyết định go/hold/rollback và support/incident channel hoạt động.

## 5. Closed beta gate

- [ ] Nhóm beta nhỏ có consent và hiểu I’m Okay không phải dịch vụ cứu hộ.
- [ ] Reliability threshold được chốt từ staging/alpha data, không bịa trước.
- [ ] Theo dõi acknowledgement/resolution time, false-alert/correction và provider reliability.
- [ ] Incident drill, provider kill switch, queue backlog và support workflow được xác minh.
- [ ] Không có sự cố mất alert, duplicate alert hoặc authorization leak do lỗi đã biết.

## 6. Production gate

- [ ] Production Supabase project, domain, sender, secret và store credential tách staging.
- [ ] Pre-launch secret rotation, migration rehearsal và backup checkpoint hoàn tất.
- [ ] Privacy policy, terms, safety limitation, support contact và store material hoàn tất.
- [ ] Monitoring/dashboard/alerts và incident owner đang hoạt động.
- [ ] Staged rollout có go/hold/rollback criteria và provider kill switch có audit.
- [ ] Deploy order tương thích: expand migration → functions → contact web/mobile → cleanup sau.
- [ ] Daily review giai đoạn đầu và incident communication process đã có owner.

## 7. Release blockers

- Sai/mất/duplicate alert hoặc check-in false success.
- IDOR, JWT/RLS/public-token bypass, service-role/secret/PII leak.
- Queue loss/lease expiry không reconciliation được missing work.
- Cron/Edge Function/provider failure không có monitoring và runbook.
- SOS accidental send hoặc drill bị nhầm là alert thật.
- Critical flow không dùng được với screen reader/keyboard/font scaling.
- Backup chưa từng restore thành công.
- Copy hứa hẹn cứu hộ/y tế vượt quá khả năng hệ thống.

## 8. Definition of Done

Một release stage chỉ hoàn thành khi checklist tương ứng có evidence, known limitations
được ghi rõ và không còn blocker. Cấu hình/build artifact không tự động là bằng
chứng đã test, deploy hoặc rollout.
