# I’m Okay — Master development roadmap

## 1. Vai trò của master roadmap

Tài liệu này điều phối toàn bộ dự án từ giai đoạn thiết kế đến production. Nó chỉ giữ:

- Trạng thái chung và milestone.
- Thứ tự triển khai giữa các hệ thống.
- Phụ thuộc và release gate xuyên mobile, web, API, worker và hạ tầng.
- Thứ tự pull request đề xuất.
- Definition of Done ở cấp sản phẩm.

Chi tiết triển khai nằm trong các plan chuyên biệt:

| Plan                                                                   | Phạm vi                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`plans/01-MOBILE-APP.md`](plans/01-MOBILE-APP.md)                     | Expo iOS/Android, M01–M12, navigation, client state, push permission  |
| [`plans/02-CONTACT-WEB.md`](plans/02-CONTACT-WEB.md)                   | Responsive web W01–W05, public invitation/alert response              |
| [`plans/03-BACKEND-API.md`](plans/03-BACKEND-API.md)                   | NestJS API, auth, domain, Prisma access, OpenAPI                      |
| [`plans/04-WORKER-NOTIFICATIONS.md`](plans/04-WORKER-NOTIFICATIONS.md) | BullMQ, scheduling, reconciliation, Expo Push, Gmail                  |
| [`plans/05-DATA-INFRA-DEVOPS.md`](plans/05-DATA-INFRA-DEVOPS.md)       | PostgreSQL, Redis, monorepo, CI/CD, environments, backup/deploy       |
| [`plans/06-QA-SECURITY-RELEASE.md`](plans/06-QA-SECURITY-RELEASE.md)   | Test strategy, security/privacy, observability, alpha/beta/production |

Không nhân bản task chi tiết vào master. Khi thay đổi một hệ thống, cập nhật plan tương ứng; chỉ cập nhật master nếu milestone, phụ thuộc hoặc release gate thay đổi.

## 2. Trạng thái hiện tại

Mốc tham chiếu: 2026-08-02.

| Hạng mục                           | Trạng thái                                                                                       | Nguồn theo dõi                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Product brief và UX flow           | Đã có bản nền                                                                                    | `design/stitch/03-PROJECT-BRIEF.md`, `04-UX-FLOWS.md` |
| Design system                      | Đã tạo                                                                                           | `design/stitch/DESIGN.md`                             |
| Mobile screens                     | Đã chọn M01–M12                                                                                  | `design/stitch/05-SCREEN-TRACKER.md`                  |
| Contact web screens                | Đã chọn W01–W05                                                                                  | `design/stitch/05-SCREEN-TRACKER.md`                  |
| Navigation contract/state variants | Mobile MA0 hoàn tất; Stitch không hỗ trợ link canvas                                             | Stitch tracker                                        |
| Responsive/accessibility QA        | Chưa hoàn tất                                                                                    | Stitch tracker                                        |
| Monorepo/source code               | Đã có workspace tối thiểu và `apps/mobile`; DI1 chưa hoàn tất                                    | Plan 01, 05                                           |
| Mobile/web/API/worker              | Mobile MA2 client hoàn tất, remote acceptance chờ API/Supabase/EAS; web/API/worker chưa scaffold | Plan 01–04                                            |
| Staging/production                 | Chưa tạo                                                                                         | Plan 05–06                                            |

## 3. Phạm vi MVP

MVP phải có:

- Expo mobile app cho Android/iOS.
- Responsive contact web không yêu cầu tài khoản.
- Supabase Auth cho email và Google.
- Check-in 24/36/48 giờ, last check-in và next deadline.
- Tối đa ba liên hệ tin cậy có invitation acceptance.
- Backend lập lịch ngay cả khi app đóng.
- Expo Push nhắc người dùng.
- Gmail gửi lời mời và alert email.
- Escalation, acknowledge, resolve và correction.
- Snooze có thời hạn, SOS có guard, drill, history và settings.
- Audit log, idempotency, retry, reconciliation, monitoring và backup.

Ngoài MVP: SMS, Zalo, WhatsApp, voice, tự liên hệ cấp cứu, vị trí liên tục, AI, wearable và thanh toán.

## 4. Kiến trúc và ranh giới

```text
apps/mobile -----------\
                       >---- apps/api ---- PostgreSQL/Supabase
apps/contact-web ------/           |                 |
                                   |                 |
                                   +---- Redis/BullMQ|
                                             |       |
                                      apps/worker ---+
                                      |-- Expo Push
                                      |-- Gmail
                                      |-- SMS disabled
                                      `-- Voice disabled
```

Ranh giới sở hữu:

- Mobile sở hữu native UX, auth session, check-in interaction và device token registration.
- Contact web sở hữu public-link UX; không tự suy diễn token permission.
- API sở hữu authorization, transaction và domain command/query.
- Worker sở hữu delayed execution, retry, provider dispatch và reconciliation.
- PostgreSQL là source of truth; Redis là executor state có thể dựng lại.
- QA/security/release là cross-cutting gate, không phải bước trang trí cuối.

## 5. Dependency graph

```text
Product/design closure
        |
        v
Monorepo + local infra + CI
        |
        +-----------> Mobile shell
        +-----------> Contact web shell
        +-----------> API foundation
                          |
                          v
                   Domain + database
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
       Auth/profile   Trusted contacts   Worker foundation
          |               |                |
          +-------+-------+                |
                  v                        |
              Check-in API ----------------+
                  |                        |
                  v                        v
              Alert domain <------ Scheduling/providers
                  |
        +---------+----------+
        |                    |
        v                    v
   Mobile alert UX     Contact response web
        |                    |
        +---------+----------+
                  v
          E2E + hardening
                  v
          Alpha -> Beta -> Production
```

## 6. Milestone và release gate

### M0 — Design ready for implementation

Owner plans: 01, 02, 06.

- Chốt navigation contract không có đường cụt cho các flow chính; click-through được triển khai và kiểm thử trong app/web vì Stitch Web không hỗ trợ link giữa các screen độc lập.
- Hoàn thiện loading/offline/error/expired/resolved variants.
- QA mobile font scaling và web 390/768/1440 px.
- Chốt ADR cho monorepo, web runtime, auth, queue, email và hosting.

Gate:

- Không còn flow dead end.
- Copy không hứa hẹn cứu hộ.
- Component/state đủ để code mà không phải tự sáng tạo UX quan trọng.

### M1 — Engineering foundation

Owner plans: 03, 05, 06.

- pnpm/Turborepo, bốn apps và shared config.
- PostgreSQL/Redis local, Prisma base migration.
- CI lint/typecheck/test/build.
- API/worker health check, env validation và structured logging.

Gate:

- Máy mới chạy được local theo README.
- CI xanh, không có secret thật.
- Migration chạy được trên database trống.

### M2 — Auth, onboarding và trusted contacts

Owner plans: 01, 02, 03, 05.

- Supabase Auth và profile/safety-plan API.
- Mobile M01–M05.
- Trusted-contact CRUD M07/M08.
- Invitation token và W01 với fake email provider.

Gate:

- Onboarding resume được sau khi app đóng.
- Invitation token được hash, có expiry/revoke và atomic consume.
- Contact trùng hoặc vượt quá ba bị chặn ở backend/database.

### M3 — Reliable check-in

Owner plans: 01, 03, 04, 05.

- Pure domain deadline/state machine.
- Check-in transaction + idempotency.
- M06 và offline/error states.
- Delayed jobs và reconciliation.

Gate:

- Concurrent check-in không tạo chu kỳ trùng.
- Redis trống có thể dựng lại queue.
- Client offline không hiển thị thành công giả.

### M4 — Notification và alert response

Owner plans: 01–04, 06.

- Expo Push/Gmail adapters, delivery log và retry.
- Alert escalation, correction và audit.
- M09, W02–W05.
- Public response token và concurrent response handling.

Gate:

- Worker restart/provider timeout không gửi trùng.
- `delivered` không tự chuyển thành `acknowledged`.
- Token expired/used không làm lộ alert data.
- Full accelerated alert flow chạy trên staging với test recipients.

### M5 — MVP feature complete

Owner plans: 01–04.

- M10 SOS, snooze, drill.
- M11 history, M12 settings.
- Account export/delete workflow theo policy.
- Tất cả feature-level test xanh.

Gate:

- SOS chạm nhầm không gửi alert.
- Snooze tự kích hoạt lại sau restart.
- Drill không thể bị hiểu nhầm là alert thật.

### M6 — Release candidate

Owner plans: 05, 06; tất cả plan hỗ trợ.

- Threat-model review, security headers, rate limit và PII scrubbing.
- Sentry/metrics/dashboard/runbook.
- Backup + restore drill.
- Mobile/web E2E, accessibility, responsive và resilience test.

Gate:

- Không cò blocker/critical defect.
- Không cò authorization finding nghiêm trọng.
- Queue recovery, provider failure và correction được kiểm thử.

### M7 — Alpha, beta và production

Owner plan: 06; plan 05 sở hữu deploy platform.

- Internal alpha qua TestFlight/Google Play Internal Testing.
- Closed beta có consent và support channel.
- Production rollout từng nhóm.
- Theo dõi queue lag, overdue job, push/email failure và false alert.

Gate production:

- Migration rehearsal/backup hoàn tất.
- Monitoring và incident contact hoạt động.
- Không có sự cố mất alert do lỗi đã biết.
- Store/privacy/support material hoàn tất.

## 7. Thứ tự pull request đề xuất

1. ADR nền tảng + pnpm/Turborepo + CI.
2. Local PostgreSQL/Redis + env validation + health checks.
3. Prisma schema/migration/seed + domain deadline/state tests.
4. Supabase auth middleware + profile/safety-plan API.
5. Mobile/web design tokens, navigation và route shells.
6. Mobile onboarding M01–M05.
7. Trusted-contact API + M07/M08.
8. Invitation token + W01 + fake email.
9. Check-in transaction + M06.
10. BullMQ scheduling + stale-job handling + reconciliation.
11. Notification dispatcher + fake providers.
12. Expo Push provider + device lifecycle.
13. Gmail provider + versioned templates.
14. Alert state machine/escalation + M09.
15. Public alert response API + W02–W05.
16. SOS + snooze + drill.
17. History/settings + account data workflow.
18. Security/privacy/observability hardening.
19. E2E/resilience/accessibility test suite.
20. Staging release, alpha/beta và production pipeline.

Mỗi PR phải có một owner plan, acceptance criteria và test phù hợp. Không trộn thay đổi hạ tầng lớn với nhiều feature UI trong cùng PR.

## 8. Quy tắc hoàn thành cấp sản phẩm

Một milestone chỉ hoàn thành khi:

- Cổng nghiệm thu của master và Definition of Done trong các owner plan đều đạt.
- Lint, format, typecheck, unit, integration và E2E liên quan xanh.
- Migration/OpenAPI/tài liệu được cập nhật.
- Không lộ secret, token hoặc PII.
- Alert/notification có transaction, idempotency, retry, audit và test đường lỗi.
- UI nói trung thực giới hạn hệ thống.
- Known limitations và operational risk còn lại được ghi rõ.

## 9. Cách cập nhật tiến độ

Khi hoàn thành hạng mục:

1. Cập nhật checkbox/status trong owner plan.
2. Ghi link PR/ADR/migration nếu có.
3. Cập nhật master chỉ khi milestone/gate/dependency thay đổi.
4. Cập nhật README khi trạng thái dự án thay đổi đáng kể.
5. Không xóa lịch sử quyết định; dùng ADR mới thay thế ADR cũ.

## 10. Sau MVP

Chỉ mở roadmap mới sau khi MVP ổn định và người dùng yêu cầu. Mỗi hạng mục cần discovery, chi phí, consent, threat model và ADR riêng:

- Thay Gmail bằng email provider production.
- SMS/Zalo/WhatsApp/voice.
- Nhiều escalation policy/nhóm gia đình.
- Wearable hoặc shortcut hệ điều hành.
- Chia sẻ vị trí có chủ ý và thời hạn.
- Thanh toán.

Không tự động thêm AI đánh giá tình trạng hoặc liên hệ cơ quan cấp cứu.
