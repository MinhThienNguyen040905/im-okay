# I’m Okay — Backend API implementation plan

## 1. Mục tiêu và trách nhiệm

Xây NestJS REST API là cổng duy nhất cho mutation nghiệp vụ. API sở hữu:

- Xác thực Supabase JWT và authorization.
- Profile, device, safety plan và trusted contacts.
- Invitation/public alert token validation và action.
- Check-in transaction, alert command/query và audit.
- OpenAPI, validation, error contract, correlation ID và rate limiting.
- Ghi outbox/intent để worker thực thi sau commit.

API không sở hữu delayed execution, provider SDK hoặc retry notification. Các phần này thuộc Plan 04.

## 2. Module boundary

```text
AppModule
  AuthModule
  UsersModule
  DevicesModule
  SafetyPlansModule
  TrustedContactsModule
  InvitationsModule
  CheckInsModule
  AlertsModule
  PublicResponsesModule
  AuditModule
  HealthModule
```

Quy tắc:

- Controller chỉ parse/validate/authenticate và gọi application service.
- Domain service quyết định invariant/state transition; không đặt logic trong controller/Prisma hook.
- Repository định nghĩa transaction boundary rõ.
- Provider SDK không được import vào API domain.
- Client không truy cập trực tiếp các bảng alert/delivery/audit.
- Mọi write quan trọng có actor, correlation ID và audit/outbox trong cùng transaction.

## 3. Domain invariant

```text
nextDeadlineAt = lastCheckInAt + checkInInterval
```

- Interval chỉ là 24/36/48 giờ trong MVP.
- Chỉ một alert chưa terminal trên mỗi safety plan.
- Check-in idempotent cập nhật deadline một lần và làm stale chu kỳ cũ.
- `sent`/`delivered` không đồng nghĩa `acknowledged`.
- Snooze luôn có `ends_at`.
- Alert đã gửi cho contact phải có correction khi user xác nhận an toàn.
- Drill và SOS có type/source rõ, không chỉ khác copy.

State machine:

```text
SafetyPlan: inactive | active | snoozed

Alert:
scheduled -> warning -> triggered -> acknowledged -> resolved
                  \-> cancelled
```

## 4. API contract dự kiến

Tên endpoint là đề xuất ban đầu; OpenAPI/code là source of truth sau khi scaffold.

### Authenticated endpoints

```text
GET    /v1/me
PATCH  /v1/me
GET    /v1/me/devices
POST   /v1/me/devices
DELETE /v1/me/devices/:deviceId

GET    /v1/safety-plan
PUT    /v1/safety-plan
POST   /v1/safety-plan/snooze
POST   /v1/safety-plan/resume
POST   /v1/safety-plan/disable
GET    /v1/safety-plan/status

GET    /v1/trusted-contacts
POST   /v1/trusted-contacts
PATCH  /v1/trusted-contacts/:contactId
DELETE /v1/trusted-contacts/:contactId
POST   /v1/trusted-contacts/reorder
POST   /v1/trusted-contacts/:contactId/resend-invitation

POST   /v1/check-ins
GET    /v1/check-ins

GET    /v1/alerts/current
GET    /v1/alerts
POST   /v1/alerts/:alertId/cancel
POST   /v1/alerts/sos
POST   /v1/alerts/drill

POST   /v1/account/export-requests
POST   /v1/account/deletion-requests
```

### Public token endpoints

Không đặt raw token trong structured log. Route có thể dùng path/query nhưng logging/Sentry phải scrub.

```text
GET  /v1/public/invitations/:token
POST /v1/public/invitations/:token/accept
POST /v1/public/invitations/:token/decline

GET  /v1/public/alerts/:token
POST /v1/public/alerts/:token/acknowledge
POST /v1/public/alerts/:token/actions
```

Public response chỉ trả projection tối thiểu, không trả Prisma entity đầy đủ.

## 5. Error và idempotency contract

Error envelope đề xuất:

```json
{
  "error": {
    "code": "CHECK_IN_CONFLICT",
    "message": "Safe user-facing message",
    "requestId": "opaque-correlation-id",
    "retryable": false,
    "details": {}
  }
}
```

- Stable machine-readable `code`; message có thể localize.
- `details` không chứa secret/PII và chỉ dùng khi client thực sự cần.
- Public-token error có copy generic để tránh enumeration.
- Mutation nhạy cảm hỗ trợ `Idempotency-Key`; unique constraint ở DB.
- Cùng key + cùng payload trả kết quả tương đương; cùng key + payload khác trả conflict.

## 6. Giai đoạn triển khai

### BA1 — API foundation

- [ ] Scaffold NestJS, TypeScript strict và module boundary.
- [ ] Env validation, structured logging, request/correlation ID.
- [ ] Global validation pipe và error filter.
- [ ] OpenAPI generation và contract artifact.
- [ ] Health/readiness endpoints.
- [ ] Prisma service và transaction helper.
- [ ] Rate-limit framework và security middleware.
- [ ] Unit/integration test harness với isolated database.

Exit: health/OpenAPI hoạt động; invalid input/error được map nhất quán.

### BA2 — Auth, profile và device

- [ ] Xác minh Supabase JWT signature, issuer, audience và expiry.
- [ ] Map auth subject sang internal user; không tin user ID từ body.
- [ ] Get/update profile với timezone IANA validation.
- [ ] Device-token register/update/disable với ownership.
- [ ] Account-disabled handling và audit.

Exit: IDOR/auth-negative test xanh; expired/wrong-audience token bị từ chối.

### BA3 — Safety plan và domain core

- [ ] Pure TypeScript deadline calculator cho 24/36/48.
- [ ] Versioned warning/escalation policy.
- [ ] Safety-plan create/update/activate/disable.
- [ ] Snooze/resume với `ends_at` bắt buộc.
- [ ] State transition tests cho alert/safety plan.
- [ ] Ghi outbox/scheduling intent sau mutation.

Exit: domain tests timezone/DST/boundary xanh; không có magic time trong controller.

### BA4 — Trusted contacts và invitations

- [ ] CRUD contact, tối đa ba, unique normalized email trong plan.
- [ ] Priority reorder atomically.
- [ ] Invitation token CSPRNG, hash, expiry, revoke/consume.
- [ ] Resend cooldown và rate limit.
- [ ] Public invitation projection + accept/decline transaction.
- [ ] Audit add/update/remove/reorder/resend/accept/decline.

Exit: concurrent accept/decline deterministic; delete contact revoke link còn hiệu lực.

### BA5 — Check-in transaction

- [ ] Auth/ownership/active-plan validation.
- [ ] Row lock hoặc optimistic version để chống concurrent mutation.
- [ ] Insert check-in với idempotency unique constraint.
- [ ] Update last/next deadline.
- [ ] Transition alert cũ nếu hợp lệ.
- [ ] Ghi audit/outbox trong cùng transaction.
- [ ] Trả authoritative status/server time cho client.

Exit: check-in trước/đúng/sau deadline và duplicate/concurrent request có test.

### BA6 — Alerts và public response

- [ ] Alert create/transition commands chỉ qua domain service.
- [ ] Unique active-alert invariant.
- [ ] Alert-step/contact priority model.
- [ ] Response token hash/scope/expiry/revoke.
- [ ] Public projection và allowed-action calculation.
- [ ] Acknowledge/contact-attempted/reached-safe/forward/resolve actions.
- [ ] Race handling khi nhiều contacts phản hồi.
- [ ] User cancel/correction sau khi alert đã gửi.
- [ ] SOS/drill commands với source/type rõ.

Exit: `delivered` không thể resolve/acknowledge; token used/expired không lộ alert data.

### BA7 — History, account data và hardening

- [ ] Cursor pagination cho check-ins/alerts/history projection.
- [ ] Account export request và deletion workflow theo retention policy.
- [ ] Authorization/IDOR/property-based state-transition tests.
- [ ] Query/index review và performance budgets.
- [ ] Audit completeness review.
- [ ] Sentry PII scrub và production logging policy.

## 7. Transaction và outbox

Business mutation không enqueue provider job trước commit. Dùng outbox/scheduling intent hoặc post-commit enqueue có reconciliation.

Check-in transaction tối thiểu:

1. Load/lock safety plan.
2. Validate idempotency và state.
3. Insert check-in.
4. Update deadline/version.
5. Transition/correct alert nếu cần.
6. Insert audit + scheduling/outbox record.
7. Commit.
8. Worker/outbox publisher enqueue job.

Không giữ DB transaction trong khi gọi Expo/Gmail/Redis network.

## 8. Kiểm thử

Unit:

- Deadline 24/36/48, timezone/DST.
- Safety-plan/alert transition matrix.
- Allowed public actions.
- Error/idempotency mapping.

Integration:

- Auth/ownership và IDOR negatives.
- Contact max/duplicate/reorder race.
- Token expiry/revoke/consume/concurrency.
- Check-in transaction/concurrency/rollback.
- Alert concurrent responses/correction.
- Migration + indexes + unique constraints.

Contract:

- OpenAPI snapshot/generation.
- Mobile/web typed client compatibility.
- Public projection không có forbidden fields.

## 9. Definition of Done

- Controller mỏng, domain invariant có pure tests.
- Authorization, transaction và database constraints đầy đủ.
- Mutation quan trọng có idempotency/audit/outbox.
- OpenAPI và error contract có test.
- Không import provider SDK vào domain/API service.
- Không log token, auth header, email body hoặc PII không cần thiết.
- Integration test bao gồm success, conflict, unauthorized và rollback.

## 10. Bước tiếp theo

1. Chốt ADR auth/API/error/outbox.
2. Chờ scaffold và database local từ Plan 05.
3. Implement BA1→BA3 trước khi các feature client phụ thuộc.

