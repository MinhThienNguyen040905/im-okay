---
name: im-okay-project
description: Xây dựng, duy trì và vận hành dự án I’m Okay — ứng dụng safety check-in cho người sống một mình. Dùng skill này khi lập kế hoạch, đọc ngữ cảnh, thiết kế Stitch, code/review mobile app hoặc responsive contact web, xây Supabase Auth/PostgreSQL/RLS/RPC/Edge Functions/Cron/Queues, check-in, deadline, alert escalation, trusted contacts, invitation/response token, SOS, snooze, drill, push/email notification, test, security, privacy, observability, deploy, release hoặc mở rộng provider của repository I’m Okay.
---

# I’m Okay Project

## 1. Sứ mệnh

Xây dựng một hệ thống safety check-in đáng tin cậy: người dùng định kỳ xác nhận mình vẫn an toàn; nếu không xác nhận trước deadline, backend nhắc người dùng và cảnh báo các liên hệ tin cậy.

Luôn ưu tiên theo thứ tự:

1. Độ tin cậy và tính đúng đắn của quy trình cảnh báo.
2. Bảo vệ dữ liệu, token và quyền truy cập.
3. Thao tác check-in đơn giản, rõ trạng thái.
4. Hạn chế báo động giả và cho phép đính chính.
5. Khả năng phục hồi khi Cron, Edge Function, queue hoặc provider gặp sự cố.
6. Tách nhà cung cấp thông báo khỏi nghiệp vụ cốt lõi.

Không mô tả I’m Okay là thiết bị y tế, dịch vụ cứu hộ, hệ thống giám sát hay giải pháp bảo đảm cứu mạng. Dùng ngôn ngữ trung thực: đây là công cụ hỗ trợ kết nối người dùng với những người họ tin tưởng.

## 2. Bắt đầu mỗi session

Trước khi đề xuất hoặc sửa code:

1. Xác định repo root bằng `git rev-parse --show-toplevel`; không phụ thuộc working directory giả định.
2. Đọc `AGENTS.md`, `README.md`, `docs/PROJECT-STATUS.md` và `git status --short`.
   Không tìm hoặc tạo lại `docs/plans/`; các plan cũ đã được thay bằng một nguồn trạng thái duy nhất.
3. Kiểm tra source, migration, test và ADR hiện có trước khi dùng kiến trúc mục tiêu trong skill này.
4. Xác định giai đoạn roadmap hiện tại và chỉ làm hạng mục được yêu cầu.
5. Phân loại thay đổi: product/design, client, Edge API, domain/RPC, data/RLS,
   cron/queue/consumer, provider, security/privacy, test hay operations.
6. Nêu rõ giả định có thể ảnh hưởng deadline, dữ liệu hoặc hành vi cảnh báo.

Không ghi đè thay đổi chưa liên quan trong dirty worktree. Không deploy, gửi notification thật, thay secret, push GitHub hoặc thao tác production nếu người dùng chưa yêu cầu.

## 3. Nguồn sự thật và cách đọc tài liệu

Ưu tiên theo thứ tự:

1. Invariant an toàn, bảo mật và phạm vi trong skill này.
2. Code, migration và automated test đang chạy.
3. ADR trong `docs/adr/`; ADR mới có thể thay thế quyết định kiến trúc cũ.
4. `docs/PROJECT-STATUS.md` cho milestone, tiến độ, build, blocker và release gate hiện hành.
5. Product/UX/design docs trong `design/stitch/`.
6. `.stitch/metadata.json` và `.stitch/designs/` cho ID, HTML và preview tải từ Stitch; đây là generated/local artifacts, không phải production source.

Khi có xung đột:

- Không tự ý nới lỏng invariant an toàn.
- Tin code/test cho hành vi hiện tại, nhưng nêu rõ nếu nó lệch product spec.
- Thay đổi framework, provider, state machine, schema cốt lõi hoặc retention bằng ADR; không chỉ sửa roadmap.
- Hỏi người dùng khi xung đột là một lựa chọn sản phẩm thật sự, không thể suy ra an toàn.

### Routing tài liệu

- Lập kế hoạch/tiến độ xuyên hệ thống: đọc `docs/PROJECT-STATUS.md`.
- Mobile M01–M12, Expo, auth client, check-in UX và remote/device gates: đọc source/test mobile,
  các ADR 0001–0007 và phần mobile trong `docs/PROJECT-STATUS.md`.
- Contact web W01–W05, Supabase schema/RLS/RPC/Edge Functions, Cron/Queues và notifications:
  đọc source/test, ADR 0008–0013 và phần backend/web trong `docs/PROJECT-STATUS.md`.
- E2E release gate, security/privacy, accessibility, observability, alpha/beta/production: đọc
  `docs/PROJECT-STATUS.md`, `docs/release/` và `docs/qa/` liên quan.
- Task chạm nhiều hệ thống: đọc master và chỉ các owner plan bị tác động; ghi rõ phụ thuộc/contract trước khi code.
- Product scope, copy và user flow/navigation: đọc `design/stitch/README.md`.
- Visual tokens/component: đọc `design/stitch/DESIGN.md`.
- Stitch screen/status: đọc `design/stitch/README.md` và `.stitch/metadata.json` nếu tồn tại.
- Từ Stitch sang code: lấy đúng screen bằng metadata/MCP, đọc HTML và xem screenshot; không coi HTML sinh ra là production code.
- Thay đổi kiến trúc: đọc toàn bộ ADR liên quan và source hiện tại.

## 4. Trạng thái dự án hiện tại

Không lưu snapshot tiến độ trong skill. Luôn đọc `docs/PROJECT-STATUS.md`, là nguồn duy nhất cho build,
deploy, evidence, blocker và việc tiếp theo.

Baseline kiến trúc ổn định:

- Mobile dùng Expo SDK 57, React Native 0.86, Expo Router, TypeScript strict và authoritative remote adapters.
- Supabase-first theo ADR 0008: Auth, PostgreSQL/RLS/RPC, Edge Functions, Cron và Queues/outbox.
- Mobile M01–M12 và contact web W01–W05 đã có implementation; selected design nằm trong project Stitch
  được định tuyến bởi `.stitch/metadata.json`.
- Android dùng Firebase/FCM chỉ như transport cho Expo Push; Supabase vẫn là application backend duy nhất.
- `fixture` chỉ được phép ở local và không gửi notification thật; `remote` dùng server projection.
- Gmail SMTP chỉ là provider tạm cho personal pilot; verified-domain provider là yêu cầu trước rollout rộng.

Không suy ra môi trường đang healthy, delivery đang bật hoặc artifact còn hiệu lực từ baseline trên;
phải kiểm tra evidence/runtime phù hợp với yêu cầu hiện tại.

## 5. Phạm vi MVP

Triển khai:

- Android/iOS bằng Expo + React Native + TypeScript.
- Responsive contact web mở từ email, không bắt cài app/đăng nhập.
- Supabase Auth: email và Google.
- Hồ sơ, timezone IANA và safety plan.
- Chu kỳ 24, 36 hoặc 48 giờ; mặc định sản phẩm 36 giờ.
- Tối đa ba trusted contacts, có invitation acceptance.
- Check-in “Tôi vẫn ổn”, last check-in và next deadline.
- Expo Push nhắc người dùng.
- EmailProvider qua adapter cho invitation/alert; ADR 0012 dùng Gmail SMTP tạm thời cho personal
  pilot, còn verified-domain HTTP provider là đường triển khai rộng.
- Alert escalation nếu chưa có contact nhận xử lý.
- Snooze có thời hạn, SOS có guard, drill, history và settings.
- Audit, delivery log, retry, reconciliation và observability.

Ngoài MVP trừ khi người dùng yêu cầu mở rộng:

- SMS, Zalo ZNS, WhatsApp, voice/call automation.
- Tự động liên hệ cơ quan cấp cứu.
- Theo dõi vị trí liên tục, ghi âm, khuôn mặt, bước chân, smartwatch.
- AI đánh giá tình trạng.
- Thanh toán/gói thuê bao.

Có thể định nghĩa interface và data status cho SMS/voice, nhưng provider phải là `disabled`; không hiển thị chúng trong MVP UI và không gửi request giả.

## 6. Kiến trúc mặc định

```text
Expo mobile        Expo responsive contact web
      \                    /
       \---- Supabase Auth + Edge Functions
                         |
                 PostgreSQL + RLS/RPC
                   |             |
                   |             `-- Cron/reconciliation
                   v
            Outbox/Supabase Queues
                   |
            Edge Function consumers
            |-- Expo Push
            |-- Email HTTP provider
            |-- SMS disabled
            `-- Voice disabled
```

Dùng:

- pnpm workspaces + Turborepo.
- `apps/mobile`, `apps/contact-web`, `supabase/migrations`, `supabase/functions` và
  `supabase/tests`; không tạo `apps/api`/`apps/worker` trong MVP.
- `packages/domain`, `packages/contracts`, `packages/ui`, `packages/config` khi có consumer thực.
- Expo Router cho mobile và contact web; tách deployable để public link không phụ thuộc bundle/app auth.
- TanStack Query cho server state; local state chỉ khi cần.
- React Hook Form + Zod cho form/client validation.
- Supabase Auth và hosted PostgreSQL là nền tảng duy nhất cho MVP; không thêm Firebase.
- SQL migrations là source of truth cho schema/function/RLS/cron/queue config.
- Edge Functions là HTTP boundary; authoritative mutation dùng PostgreSQL function/RPC trong
  transaction. Giữ `/v1/...`, projection, error code và `Idempotency-Key` mà mobile đã test.
- Authenticated Edge Function ưu tiên user-scoped database client mang caller JWT để
  `auth.uid()`/RLS còn hiệu lực. Service role chỉ cho internal/public-token RPC hẹp, có
  explicit actor/scope check; không tin actor ID từ body.
- Versioned Zod/TypeScript contracts; generated DB types không thay public contract. OpenAPI
  không bắt buộc cho MVP nếu chưa có consumer/tooling cần.
- Supabase Cron + Queues/Postgres outbox cho scheduling/retry/reconciliation.
- Expo Push Notifications và configurable EmailProvider; Gmail SMTP chỉ dùng cho personal pilot,
  Resend/HTTP provider giữ làm đường verified-domain deployment.
- Sentry/log/metrics cho mobile, web, Edge Functions, cron, queue và provider.

Không cho client ghi trực tiếp `alerts`, `alert_steps`, `alert_responses`,
`notification_deliveries`, `audit_logs`, `outbox_events` hoặc queue. Mọi mutation nghiệp vụ
đi qua Edge Function + authoritative RPC; service-role key không bao giờ vào client.

Nếu source/ADR sau này đã chọn công nghệ khác, không scaffold lại mù quáng. Đọc ADR, nêu trade-off và chỉ migration khi người dùng chấp thuận phạm vi thay đổi.

## 7. Invariant deadline và alert

### Deadline duy nhất

```text
nextDeadlineAt = lastCheckInAt + checkInInterval
```

“36 giờ” nghĩa là deadline sau 36 giờ kể từ check-in hợp lệ gần nhất. Không hiểu
là 36 giờ sau một lịch trung gian. Tập trung phép tính trong một authoritative
database/domain function có test; không rải công thức ở client, Edge handler, SQL trigger và
queue consumer.

Timeline mặc định cho chu kỳ 36 giờ:

```text
24h  push nhắc nhẹ
32h  push nhắc khẩn
35h  push + email cho chính người dùng
36h  trigger alert + email contact ưu tiên 1
38h  nếu chưa acknowledged, email các contact còn lại
```

Timeline có thể được điều chỉ bằng config/versioned policy và test, không bằng magic numbers trong job handler.

### State machine

```text
SafetyPlan: inactive | active | snoozed

Alert:
scheduled -> warning -> triggered -> acknowledged -> resolved
                  \-> cancelled
```

Bất biến:

- Chỉ một alert chưa kết thúc trên mỗi safety plan.
- Chỉ authoritative domain/RPC command được quyết định state transition; Edge
  handler/scheduler/consumer chỉ validate và gọi command.
- Check-in hợp lệ phải cập nhật deadline và làm stale/cancel job chu kỳ cũ.
- Job khi chạy phải nạp state hiện tại từ PostgreSQL; không tin payload cũ.
- `sent`/`delivered` là trạng thái kênh; không đồng nghĩa `acknowledged`.
- Email đã gửi không tự động resolve alert.
- User có thể cancel trước khi contact được báo.
- Sau khi đã báo contact, mọi correction/cancel phải có audit và notification đính chính phù hợp.
- Snooze luôn có `ends_at`; không có snooze vô thời hạn.
- SOS và drill dùng cùng hạ tầng tin cậy nhưng phải phân biệt `source/type` và copy.

## 8. Transaction, queue và idempotency

PostgreSQL domain state là source of truth. Supabase Queues/Postgres outbox là executor state
có thể dựng lại.

Khi check-in:

1. Xác thực actor và safety plan.
2. Dùng transaction cùng row lock hoặc optimistic version để chống race.
3. Insert `check_ins` với idempotency key có unique constraint.
4. Update `last_check_in_at` và `next_deadline_at`.
5. Transition alert cũ nếu hợp lệ.
6. Ghi audit/outbox trong cùng transaction.
7. Cron/consumer publish/claim work sau commit; reconciliation bù nếu queue work thất lạc.

Queue consumer:

- Hoạt động theo at-least-once.
- Dùng stable idempotency key theo business action, recipient, channel và policy version.
- Kiểm tra stale job bằng deadline/alert version.
- Ghi attempt và sanitized error.
- Retry exponential backoff; phân biệt permanent/transient error.
- Đưa work hết retry vào failed/dead-letter path có metric và runbook.
- Không coi retry là alert hoặc delivery mới.

Chạy reconciliation định kỳ để tìm deadline/alert thiếu work, message stale,
lease hết hạn và delivery stuck. Phải test xóa queue messages rồi dựng lại từ domain state.

## 9. Notification provider

Dùng interface tương đương:

```ts
type NotificationChannel = "push" | "email" | "sms" | "voice";

interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: OutboundNotification): Promise<ProviderResult>;
}
```

Luôn đi qua `NotificationDispatcher`; alert domain không import Expo SDK hoặc Nodemailer.

Mỗi delivery tối thiểu có:

- `id`, `idempotency_key`, `channel`, `provider`.
- `recipient_ref` an toàn; tránh nhân bản PII không cần thiết.
- `provider_message_id` nếu có.
- `status`: `queued | sent | delivered | failed | unknown`.
- `attempt_count`, `last_attempt_at`, `last_error_code`, sanitized detail.
- `template_key`, `template_version`, correlation/alert ID.

Email provider cho personal pilot:

```text
EMAIL_PROVIDER=gmail_smtp
GMAIL_SMTP_USERNAME=
GMAIL_SMTP_APP_PASSWORD=
GMAIL_SMTP_FROM=
```

- ADR 0012 cho phép Gmail SMTP tạm thời khi chưa có domain; Resend adapter vẫn được giữ để chuyển sang
  verified-domain provider trước khi triển khai rộng.
- Gmail SMTP không có idempotency guarantee mạnh như HTTP provider; deterministic Message-ID chỉ hỗ
  trợ correlation và unknown outcome vẫn phải kiểm tra duplicate trong supervised smoke.
- Không commit API key/token/email cá nhân; secret chỉ ở Supabase project secrets.
- Provider `accepted` chỉ chuyển delivery thành `sent`; không suy ra đã đọc/delivered.
- Local/CI dùng fake provider; smoke thật chỉ với explicit flag và test recipient đã consent.

Expo Push:

- Lưu nhiều device token/user với platform, last seen và enabled state.
- Disable token khi receipt nói token không còn hợp lệ.
- Push chỉ là reminder channel trong MVP.
- Local notification có thể bổ trợ UX nhưng không quyết định deadline/alert.

## 10. Mô hình dữ liệu tối thiểu

```text
users
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
```

Quy tắc:

- Dùng UTC cho timestamp; IANA timezone như `Asia/Ho_Chi_Minh` cho hiển thị/tính lịch có chủ ý.
- Không lưu deadline chỉ bằng giờ/phút local.
- Dùng database unique constraint cho invariant, không chỉ check trong app.
- Không hard-delete check-in, alert, delivery hoặc audit qua API thông thường.
- Account deletion là workflow riêng có retention/anonymization policy và audit.
- Migration tiến về phía trước; không sửa migration đã chạy trên shared environment.
- Seed/test data dùng danh tính giả; không dùng email/số điện thoại cá nhân.

## 11. Public invitation và alert link

- Sinh token đủ entropy bằng CSPRNG; chỉ lưu hash.
- Token có expiry, scope đúng invitation/alert/contact/action và có thể revoke.
- One-time action phải atomically consume token; GET không được thay đổi state.
- Rate limit và tránh phân biệt chi tiết token không tồn tại/hết hạn.
- Dùng HTTPS, CSP phù hợp, `Referrer-Policy: no-referrer`, `noindex` và không nhúng third-party analytics trên token page mặc định.
- Không log URL/token; scrub query/route params trong Sentry.
- Chỉ hiển thị dữ liệu tối thiểu. Không lộ vị trí, dữ liệu sức khỏe, địa chỉ hoặc toàn bộ danh sách contact.
- Xác minh chữ ký chính thức cho webhook provider nếu sau này có webhook.

## 12. UX và chuyển Stitch sang code

Trang chủ phải làm rõ trong khoảng ba giây:

```text
Bạn có ổn không?
[ Tôi vẫn ổn ]
Lần xác nhận gần nhất
Thời hạn tiếp theo
```

Quy tắc UX:

- Chỉ một primary CTA trên mỗi screen.
- Warning, alert, SOS và drill phân biệt bằng icon + wording + color.
- SOS yêu cầu giữ ba giây hoặc accessible two-step alternative.
- Xác nhận mạnh khi tắt bảo vệ, xóa contact hoặc hủy alert đã gửi; không bắt PIN cho check-in thường.
- Offline không hiển thị check-in thành công giả.
- Touch target tối thiểu 48×48, focus rõ, screen-reader label đầy đủ và layout chịu font scaling.
- Copy tiếng Việt tự nhiên, đúng dấu, bình tĩnh, không đổ lỗi.

Khi code từ Stitch:

1. Đọc tracker/metadata và lấy đúng selected screen qua Stitch MCP nếu cần.
2. Xem screenshot để hiểu visual intent; đọc HTML để tham khảo hierarchy, spacing và content.
3. Chuyển `DESIGN.md` thành typed design tokens; không rải hex/radius trong screen code.
4. Tách screen thành semantic component và state; không copy generated HTML/CSS nguyên khối.
5. Dùng data giả/chế độ Storybook hoặc preview trước khi nối API.
6. Implement loading, empty, error, offline, disabled và accessibility state.
7. So sánh visual với Stitch ở viewport yêu cầu, nhưng ưu tiên usability/accessibility hơn pixel-copy có lỗi.
8. Cập nhật tracker khi code làm lộ design gap; sửa selected screen thay vì tạo visual direction mới tùy tiện.

## 13. Quy trình triển khai theo loại thay đổi

### Feature nghiệp vụ

1. Viết acceptance criteria và xác định invariant.
2. Viết/cập nhật pure domain test.
3. Cập nhật schema/migration nếu cần.
4. Implement repository/service trong transaction boundary.
5. Implement Edge API contract, JWT/ownership và RLS authorization.
6. Implement queue/provider side effect sau commit.
7. Nối client state và error handling.
8. Chạy unit, integration và E2E liên quan.

### Schema/migration

1. Kiểm tra data shape và migration hiện có.
2. Ưu tiên additive/expand-contract migration.
3. Backfill bằng job/script idempotent nếu dữ liệu lớn.
4. Không drop/rename cột đang được consumer dùng trong cùng release.
5. Test migration từ database trống và snapshot gần production.

### Notification/provider

1. Viết provider contract test với fake.
2. Map transient/permanent errors rõ ràng.
3. Thêm timeout, retry và idempotency trước smoke test thật.
4. Dùng test account/recipient chuyên dụng.
5. Không gửi thật trong CI mặc định.
6. Cập nhật runbook/quota/cost khi provider thay đổi.

### Bug alert/deadline

1. Dừng và tái hiện bằng clock kiểm soát; không test bằng sleep thật.
2. Kiểm tra DB state, audit, queue và delivery theo cùng correlation ID.
3. Xác định race/retry/stale job/timezone trước khi sửa UI.
4. Thêm regression test thất bại trước hoặc cùng fix.
5. Nếu đã ảnh hưởng production, giữ audit và viết incident note; không che bằng xóa log.

### Deploy/release

1. Kiểm tra environment target và diff migration.
2. Chạy CI, smoke test staging và backup/restore checkpoint.
3. Deploy expand migration, backward-compatible Edge Functions rồi clients theo thứ tự.
4. Xác minh RLS, function health/error, cron run/lag, queue age, reconciliation và
   push/email smoke.
5. Rollout client theo nhóm; theo dõi error/notification metrics.
6. Rollback code bằng version cũ; không rollback migration phá dữ liệu nếu chưa có kế hoạch được kiểm chứng.

## 14. Kiểm thử rủi ro

Unit bắt buộc:

- Preset 24/36/48 giờ và timeline policy.
- UTC/timezone/DST và thay đổi timezone.
- Check-in ngay trước, đúng và sau deadline.
- Hai check-in đồng thời/idempotent retry.
- Mọi alert transition hợp lệ và không hợp lệ.
- Snooze expiry, SOS guard và drill labeling.
- Cancel/correction sau khi một phần notification đã gửi.

Integration bắt buộc:

- Edge API → DB/outbox → queue → consumer.
- Retry Expo/email qua fake mà không gửi trùng.
- Edge Function termination/reinvoke trong khi xử lý.
- Queue message bị xóa/lease hết hạn và reconciliation dựng lại work.
- Contact ưu tiên không phản hồi và escalation.
- Invitation/response token hết hạn, đã dùng, revoke và concurrent submit.
- User check-in sau khi contact đã nhận alert.

Client/E2E bắt buộc:

- Onboarding resume và auth expiry.
- Push denied/disabled.
- Check-in success, offline, timeout và duplicate tap.
- Dynamic font/screen reader/focus order.
- Web link ở 390/768/1440 px.
- SOS accidental tap và accessible alternative.

Dùng fake clock và fake provider trong test mặc định. Chỉ smoke test provider thật khi có env flag và recipient chuyên dụng.

## 15. Security, privacy và observability

- Xác minh auth/ownership trên mọi private resource; không tin ID từ client.
- Rate limit login, check-in, invitation resend, SOS và public response.
- Validate input bằng Zod/class-validator tại boundary; escape template output.
- Không log authorization header, cookie, public token, App Password, email body hay dữ liệu vị trí/sức khỏe.
- Dùng correlation ID xuyên API, job, delivery và audit.
- Sentry scrub PII; analytics chỉ thu dữ liệu cần thiết.
- Theo dõi Edge Function error/latency, cron run/failure, scheduler lag, queue age/depth,
  deadline thiếu work, reconciliation repair và provider failure.
- Backup PostgreSQL và diễn tập restore; không chỉ tin vào cấu hình backup.
- Tạo runbook cho provider outage, cron/function outage, queue backlog/loss, migration fail
  và public-token incident.

## 16. Definition of Done

Một feature thông thường hoàn thành khi:

- Acceptance criteria và authorization rule được đáp ứng.
- Loading/empty/error/offline state hợp lý.
- Lint, format, typecheck, unit/integration test liên quan xanh.
- Migration, RLS, versioned contract, docs và roadmap được cập nhật nếu cần.
- Không lộ secret/PII; accessibility được kiểm tra.

Feature cảnh báo/notification chỉ hoàn thành khi thêm:

- State/invariant rõ và chạy trên backend khi app đóng.
- Transaction/idempotency/retry/stale-job handling.
- Audit log và correlation ID.
- Test đường thành công, provider fail, function termination/queue lease expiry và
  duplicate attempt.
- UI nói trung thực trạng thái kênh và giới hạn hệ thống.

Không đánh dấu complete chỉ vì code compile hoặc email provider trả `accepted`.

## 17. Kiểm tra và bàn giao cho session sau

Khi repository đã scaffold, chạy các lệnh tương đương do root `package.json` quy định, dự kiến:

```text
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Không bịa lệnh nếu repo chưa scaffold; đọc scripts thực tế trước khi chạy.

Trước khi kết thúc một thay đổi lớn:

1. Ghi rõ kết quả, file đã thay đổi và test đã chạy.
2. Nêu test chưa chạy hoặc giới hạn còn lại.
3. Cập nhật `docs/PROJECT-STATUS.md` khi task, evidence, build, blocker, milestone hoặc gate thay đổi;
   không tạo thêm plan/roadmap tiến độ song song.
4. Cập nhật `README.md` khi trạng thái dự án hoặc setup thay đổi.
5. Cập nhật Stitch tracker/metadata khi selected design thay đổi.
6. Tạo/cập nhật ADR khi quyết định kiến trúc thay đổi.
7. Không commit/push/deploy trừ khi yêu cầu bao gồm hành động đó.
