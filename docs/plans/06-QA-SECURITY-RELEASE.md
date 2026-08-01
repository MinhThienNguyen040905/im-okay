# I’m Okay — QA, security and release plan

## 1. Mục tiêu và phạm vi

Đặt cổng chất lượng xuyên suốt cho mobile, contact web, API, worker và data/infra. Plan này sở hữu:

- Test strategy và release gates.
- Accessibility/responsive/performance QA.
- Threat modeling, privacy, security verification.
- Observability, incident readiness và operational validation.
- Internal alpha, closed beta và production rollout.

QA/security không bắt đầu sau khi feature complete. Mỗi plan phải hoàn thành test của feature; plan này xác minh tích hợp và release readiness.

## 2. Risk-based priority

Thứ tự sửa lỗi:

1. Mất/sai/duplicate alert, data corruption hoặc authorization bypass.
2. Token/secret/PII leak.
3. Worker/queue/reconciliation/backup failure.
4. Check-in false success, SOS accidental send, false drill/real labeling.
5. Accessibility blocker và luồng dead end.
6. Crash/performance nghiêm trọng.
7. Cosmetic/visual polish.

## 3. Test pyramid và ownership

| Lớp | Mục tiêu | Owner chính |
|---|---|---|
| Static | Format, lint, typecheck, schema/OpenAPI drift | Mỗi plan + CI |
| Unit | Domain math/state, validation, component behavior | Plan 01–04 |
| Integration | API→DB→queue→worker/provider fake | Plan 03–04 |
| Contract | OpenAPI clients, error/projection/template data | Plan 01–04 |
| Component | Mobile/web state, accessibility, interaction | Plan 01–02 |
| E2E | User/contact journeys trên staging | Plan 06 |
| Resilience | Redis loss, worker restart, provider timeout, restore | Plan 04–06 |
| Smoke thật | Expo/Gmail với test recipients | Plan 04/06 |

Dùng fake clock và fake providers trong default test. Không chờ 24/36/48 giờ thật.

## 4. Critical journey matrix

### Mobile

- M01→M06 onboarding với email và Google.
- Session restore/token expiry/account disabled.
- Push granted/denied/disabled.
- Check-in success, duplicate tap, offline, timeout và retry.
- Contact add/max/duplicate/resend/remove.
- M09 check-in/snooze và deadline boundary.
- SOS accidental tap/hold/two-step alternative.
- Drill phân biệt alert thật.
- History/settings/disable plan/account request.

### Contact web

- Invitation accept/decline.
- Token invalid/expired/used/revoked.
- W02→W05 alert response.
- Hai contacts phản hồi gần đồng thời.
- User check-in/cancel trong khi contact đang xử lý.
- Real alert/drill/SOS labels.

### Backend/worker

- 24/36/48 timeline và timezone/DST.
- Check-in trước/đúng/sau deadline.
- Concurrent check-in/idempotent retry.
- Worker restart trước/sau provider call.
- Redis trống và reconciliation rebuild.
- Provider transient/permanent/unknown outcome.
- Priority contact không phản hồi và escalation.
- Correction sau notification đã gửi.
- Snooze-end sau restart.

## 5. Accessibility và responsive gate

Mobile:

- Touch target tối thiểu 48×48.
- VoiceOver/TalkBack labels, roles, values và announcements.
- Focus order và keyboard khi có external keyboard.
- Dynamic font không clip CTA/deadline/error.
- Giảm chuyển động và không phụ thuộc haptic.
- Status không chỉ dùng màu.

Web:

- 390/768/1440 px và zoom 200%.
- Keyboard-only và visible focus.
- Heading/landmark/form label/error semantics.
- Screen-reader announcements sau mutation.
- WCAG AA contrast và không horizontal scroll không cần thiết.

## 6. Security plan

### Threat model

Tối thiểu phải review:

- Supabase JWT forgery/wrong audience/session theft.
- IDOR giữa users/safety plans/contacts/alerts.
- Public token brute force, leakage, replay, expiry bypass và over-broad scope.
- Concurrent check-in/response race.
- Injection và email template escaping.
- Abuse invitation resend/SOS/check-in/public endpoints.
- Queue replay, stale jobs và duplicate provider side effects.
- Secret leakage trong Expo bundle, logs, Sentry, CI artifacts.
- Referrer/cache/indexing leak trên public pages.
- Backup/restore và account-deletion data lifecycle.

### Controls

- Auth signature/issuer/audience/expiry và ownership checks.
- Rate limit theo IP/user/resource và resend cooldown.
- CSPRNG tokens, hash-at-rest, scope, expiry, revoke, atomic consume.
- CSP, CORS allowlist, HTTPS, no-referrer, no-store, noindex.
- Input validation, output escaping và sanitized error.
- Correlation ID không chứa user/token data.
- Secret manager/least privilege/rotation.
- SAST/dependency/secret/license scans trong CI.

### Security exit criteria

- Không có critical/high authorization finding chưa xử lý.
- Public projection không có forbidden fields.
- Token không xuất hiện trong log/referrer/cache/analytics.
- Dependency với critical known vulnerability được fix/mitigate/document rõ.

## 7. Privacy và product safety

Trước beta cần có:

- Privacy policy và terms/support contact.
- Safety limitation: không phải y tế/cứu hộ/bảo đảm cứu mạng.
- Mục đích thu thập, retention và account export/delete policy.
- Consent/notice cho push, email contact và beta testing.
- Dữ liệu tối thiểu trên public link và lock-screen push.
- Quy tắc không đưa token/email/body alert vào analytics.

## 8. Observability và SLO ban đầu

Metrics:

- API error/latency và auth/rate-limit failures.
- Worker heartbeat, queue depth/lag/duration/failure.
- Deadline quá hạn thiếu alert/job.
- Reconciliation scan/repair/anomaly.
- Notification sent/delivered/failed/unknown/retry theo provider.
- Duplicate suppressed/idempotency conflicts.
- Mobile/web crash-free sessions và critical journey failures.

Product metrics tối thiểu:

- Onboarding completion.
- Tỷ lệ có contact confirmed.
- Check-in success/failure.
- Alert acknowledgement/resolution time.
- False-alert/correction rate.

Chốt ngưỡng SLO/alert sau staging data; không bịa con số production khi chưa đo. Alert operator tối thiểu cho worker down, queue lag, overdue job, reconciliation anomaly và provider failure liên tiếp.

## 9. Giai đoạn triển khai

### QR1 — Quality foundation

- [ ] Test conventions, fixtures, fake clock/provider và isolated DB.
- [ ] CI gates cho static/unit/integration/build/schema/OpenAPI.
- [ ] Test data policy không dùng PII thật.
- [ ] Bug severity/triage và release-blocking criteria.
- [ ] Accessibility checklist và device/browser matrix.

### QR2 — Feature-level continuous QA

- [ ] Mỗi feature PR có acceptance + negative/error tests.
- [ ] Contract test cho mobile/web/API.
- [ ] Visual/accessibility review khi chuyển Stitch sang code.
- [ ] Regression test bắt buộc cho bug deadline/alert/token.
- [ ] Không merge known duplicate-notification/data-loss bug.

### QR3 — Security/privacy hardening

- [ ] Threat-model workshop/review và findings tracker.
- [ ] Auth/IDOR/public-token/rate-limit tests.
- [ ] Security headers/CORS/CSP/no-referrer/no-store/noindex checks.
- [ ] Log/Sentry/analytics PII/token scrub verification.
- [ ] Secret rotation và dependency scan review.
- [ ] Privacy/terms/safety/retention/account deletion material.

### QR4 — Release candidate on staging

- [ ] Full mobile/contact web critical journeys.
- [ ] Accelerated 36-hour equivalent alert flow với test recipients.
- [ ] Worker restart, Redis loss và provider failure exercises.
- [ ] Database backup + restore drill.
- [ ] Accessibility/responsive/performance test.
- [ ] Known limitations, release checklist và runbooks.

Exit: không cò blocker/critical; full alert/correction/recovery flow được chứng minh.

### QR5 — Internal alpha

- [ ] TestFlight/Google Play Internal Testing.
- [ ] Chỉ dùng contact đã được thông báo là test.
- [ ] Theo dõi crash, queue, delivery, false alert và copy confusion.
- [ ] Support/incident contact và feedback workflow.
- [ ] Fix reliability/privacy/accessibility trước cosmetic polish.

### QR6 — Closed beta

- [ ] Nhóm nhỏ có consent rõ ràng.
- [ ] Theo dõi acknowledgement/resolution/false-alert và provider reliability.
- [ ] Review timeline chỉ từ data, ADR và updated tests.
- [ ] Incident drill và support readiness.

Exit: không có sự cố mất alert do lỗi đã biết; reliability nằm trong ngưỡng beta đã chốt.

### QR7 — Production launch

- [ ] Production secret/resources tách staging và pre-launch rotation.
- [ ] Migration rehearsal + backup checkpoint.
- [ ] HTTPS/domain/deep links/email sender/store/privacy/support verification.
- [ ] Monitoring dashboards/alerts/on-call contact hoạt động.
- [ ] Staged rollout và rollback/kill-switch plan.
- [ ] Daily review giai đoạn đầu và incident communication process.

## 10. Performance budgets cần chốt trên staging

- Mobile startup và screen interactive time trên device trung bình/thấp.
- Check-in API p50/p95 và timeout UX.
- Public web initial load trên mobile network.
- Queue scheduling accuracy/lag và provider dispatch latency.
- Reconciliation duration trên quy mô beta/production dự kiến.

Ghi con số đã đo vào ADR/SLO document; không chọn budget không có baseline.

## 11. Release blockers

- Sai/mất/duplicate alert hoặc check-in false success.
- IDOR/token bypass/secret leak/PII leak.
- Redis loss không dựng lại được queue.
- Worker/provider failure không có monitoring/runbook.
- SOS accidental send hoặc drill bị nhầm là alert thật.
- Critical flow không dùng được với screen reader/keyboard.
- Backup chưa từng restore thành công.
- Store/product copy hứa hẹn cứu hộ quá khả năng.

## 12. Definition of Done

- Test matrix critical journeys xanh trên staging gần production.
- Security/privacy findings được fix/mitigate/document theo release gate.
- Accessibility/responsive/performance baseline được đo.
- Monitoring, backup/restore, runbook và incident contact hoạt động.
- Known limitations và safety copy được công bố trung thực.
- Alpha/beta/production chỉ chuyển giai đoạn khi master gate tương ứng đạt.

## 13. Bước tiếp theo

1. Thiết lập QR1 cùng monorepo/CI.
2. Hoàn tất design accessibility/state QA trước khi code hàng loạt.
3. Tạo threat model/retention ADR trước khi public token và beta được mở.

