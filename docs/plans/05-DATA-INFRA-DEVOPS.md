# I’m Okay — Data, infrastructure and DevOps plan

## 1. Mục tiêu và phạm vi

Cung cấp nền tảng có thể lặp lại cho mobile, contact web, API và worker:

- pnpm/Turborepo monorepo và shared tooling.
- PostgreSQL/Supabase, Prisma migrations và Redis/BullMQ.
- Môi trường local/staging/production và secret management.
- CI/CD, artifact/versioning, deploy order và rollback.
- Database backup, restore, retention và data operations.
- Hạ tầng monitoring cơ bản; alert definition chi tiết phối hợp Plan 06.

## 2. Monorepo mục tiêu

```text
apps/
  mobile/
  contact-web/
  api/
  worker/
packages/
  domain/
  contracts/
  ui/
  config/
prisma/
  schema.prisma
  migrations/
infra/
docs/
  adr/
  plans/
```

Nguyên tắc:

- pnpm lockfile duy nhất và frozen install trong CI.
- TypeScript strict; shared ESLint/format/test config.
- Client không import package server-only.
- Chỉ tách shared package khi có từ hai consumer thật.
- `packages/domain` pure TypeScript, không import NestJS/Prisma/provider SDK.
- `packages/contracts` sinh/kiểm tra từ OpenAPI; không có hai schema trôi dạt.

## 3. Mô hình dữ liệu

Entity tối thiểu:

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
outbox_events hoặc scheduling_intents
```

Quy tắc:

- UUID cho ID public/internal trừ khi có lý do khác.
- Tất cả timestamp lưu UTC; timezone IANA ở user/safety plan khi cần.
- Database unique/check/foreign-key constraints bảo vệ invariant.
- Chỉ lưu hash invitation/response token; có expiry/consumed/revoked timestamps.
- Không hard-delete check-in, alert, delivery, response hoặc audit qua user API.
- Retention/anonymization/account deletion có policy và migration/job riêng.
- Index theo owner/status/deadline/alert/queue reconciliation query; kiểm tra query plan trước production.

Invariant database cần xem xét:

- Tối đa ba contacts/enforced qua transaction + constraint/locking strategy.
- Unique normalized contact email trong safety plan.
- Unique check-in idempotency key theo actor/scope.
- Unique active alert bằng partial unique index hoặc transaction-safe alternative.
- Unique notification delivery idempotency key.
- Unique outbox event ID và publish state.

## 4. Môi trường

### Local

- PostgreSQL + Redis qua Docker Compose hoặc Supabase local có tài liệu rõ.
- Fake notification providers mặc định.
- Seed chỉ dùng danh tính/email giả.
- Fake clock/accelerated policy qua explicit test config, không đổi production domain code.

### Staging

- Project/database/Redis/secret tách production.
- Test recipients/devices chuyên dụng.
- Có accelerated alert policy gắn nhãn staging.
- Dữ liệu không copy PII production trừ khi được anonymize và cho phép.

### Production

- Tài khoản dịch vụ và owner rõ ràng.
- Secret manager, least privilege và rotation runbook.
- Backup/PITR theo khả năng provider và restore drill định kỳ.
- Deploy/monitoring domain, HTTPS và support ownership rõ.

## 5. Biến môi trường

Tối thiểu dự kiến:

```text
NODE_ENV=
APP_ENV=
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_AUDIENCE=
EXPO_ACCESS_TOKEN=
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM_NAME=I'm Okay
PUBLIC_APP_URL=
SENTRY_DSN_API=
SENTRY_DSN_WORKER=
SENTRY_DSN_MOBILE=
SENTRY_DSN_WEB=
```

- `.env.example` chỉ có tên biến/giá trị giả và ghi chú public/server-only.
- Validate env khi process khởi động; không fallback im lặng cho secret bắt buộc.
- Không đưa server secret vào Expo public config/bundle.
- Production secret chỉ nằm trong platform secret manager.

## 6. Giai đoạn triển khai

### DI1 — Workspace và CI foundation

- [ ] Khởi tạo pnpm workspace/Turborepo và bốn apps.
- [ ] Root scripts cho lint, format, typecheck, test, build.
- [ ] Shared TypeScript/ESLint/test config và package boundaries.
- [ ] `.nvmrc`/tool version hoặc Corepack version pin.
- [ ] CI frozen install + cache an toàn + affected/full checks.
- [ ] Dependency update automation, secret scan và license/dependency audit.
- [ ] README local setup từ máy trống.

Exit: CI xanh; bốn app smoke build; không có manual step ngầm.

### DI2 — Local PostgreSQL/Redis và Prisma

- [ ] Docker Compose/Supabase local config với health checks.
- [ ] Prisma base schema, migration đầu và seed giả.
- [ ] Migration/status/reset commands chỉ nhắm local an toàn.
- [ ] Integration test database lifecycle.
- [ ] Redis namespace/prefix theo environment và BullMQ connection config.
- [ ] Database/Redis readiness cho API/worker.

Exit: migration chạy từ DB trống; local stack khởi động/dừng có hướng dẫn.

### DI3 — Schema và migration discipline

- [ ] Implement entity/constraint/index trong mục 3.
- [ ] Expand-contract migration convention.
- [ ] Forward-only shared-environment migrations.
- [ ] Idempotent backfill script convention và progress metric.
- [ ] Migration test từ empty DB và snapshot gần production.
- [ ] ADR retention/account deletion/anonymization.

Exit: schema hỗ trợ invariant API/worker; không cần Redis để khôi phục business state.

### DI4 — Staging

- [ ] Tạo tài nguyên staging tách biệt.
- [ ] CI deploy preview/staging theo branch/main policy.
- [ ] Chạy migration theo release job có log và lock.
- [ ] Configure test domain/HTTPS/deep links.
- [ ] Configure Sentry/metrics/logging và test recipients.
- [ ] Smoke API/worker/mobile/web sau deploy.

Exit: accelerated E2E alert flow chạy được trên staging.

### DI5 — Backup, restore và resilience

- [ ] Xác định RPO/RTO thực tế cho MVP.
- [ ] Database backup/PITR config và ownership.
- [ ] Restore staging drill và data-integrity checks.
- [ ] Redis-loss drill + worker reconciliation.
- [ ] Provider config/secret rotation drill.
- [ ] Runbook database full/unavailable, Redis unavailable và migration failure.

Exit: restore được thực hiện chứ không chỉ được cấu hình.

### DI6 — Production deploy pipeline

- [ ] Production resources tách staging và least-privilege access.
- [ ] Build immutable/versioned artifacts.
- [ ] Schema-compatible deploy order: expand migration → API/worker → clients → contract cleanup release sau.
- [ ] Pre-deploy backup/checks và post-deploy smoke.
- [ ] Rollback code version; migration rollback chỉ theo verified runbook.
- [ ] Mobile store build/signing/release profiles.
- [ ] Contact web/API/worker staged rollout và health verification.

## 7. CI pipeline

Pull request:

```text
install --frozen-lockfile
format:check
lint
typecheck
unit tests
integration tests liên quan
OpenAPI/schema drift checks
build affected apps
secret/dependency scan
```

Main/release thêm:

- Full integration/E2E theo môi trường.
- Migration dry-run/status.
- Versioned artifacts/source maps.
- Staging deploy + smoke.
- Production deploy có release gate/authorization.

Không chạy provider smoke thật trong PR CI mặc định.

## 8. Dữ liệu và retention

Cần ADR trước beta cho:

- Check-in/alert/response/delivery/audit retention.
- User-requested export format và thời hạn hoàn thành.
- Account deletion: xóa, anonymize hoặc giữ bản ghi bắt buộc.
- Backup retention và khi nào deletion lan tới backup.
- Log/Sentry retention và PII scrub.

Không tự chọn retention dài “phòng khi cần”. Chỉ giữ dữ liệu theo mục đích đã nêu.

## 9. Kiểm thử

- Monorepo clean install trên runner mới.
- Migration empty/snapshot DB và concurrent migration lock.
- Unique/check/FK constraints cho invariant.
- Secret không xuất hiện trong bundle/log/artifact.
- Redis loss, DB reconnect, backup/restore.
- Deploy compatibility API/worker/schema/clients.
- Smoke health, queue heartbeat, public web headers và mobile config.

## 10. Definition of Done

- Local/staging/production tách biệt và có tài liệu.
- CI tái lặp, pinned toolchain và frozen lockfile.
- Migration forward-safe, constraints/index đúng và restore đã diễn tập.
- Secret không nằm trong source/client bundle.
- PostgreSQL đủ để khôi phục queue sau Redis loss.
- Deploy/rollback/runbook và ownership rõ.
- Production mutation chỉ sau explicit authorization/release gate.

## 11. Bước tiếp theo

1. Chốt ADR monorepo, hosting, auth, queue và retention.
2. Implement DI1–DI2 để mở khóa ba plan code còn lại.
3. Thiết kế DI3 cùng Backend API, không tạo schema tách rời domain.

