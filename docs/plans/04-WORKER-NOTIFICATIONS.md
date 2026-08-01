# I’m Okay — Worker and notifications implementation plan

## 1. Mục tiêu và trách nhiệm

Xây NestJS/BullMQ worker để thực thi deadline, reminder, alert escalation và notification một cách khôi phục được. Worker sở hữu:

- Delayed job scheduling và stale-job validation.
- Reconciliation giữa PostgreSQL và Redis/BullMQ.
- Notification dispatcher/provider adapters.
- Retry, timeout, dead-letter, receipt handling và delivery log.
- Expo Push và Gmail trong MVP.
- SMS/voice adapters ở trạng thái `disabled`.

Worker không tự bịa domain transition. Nó nạp state hiện tại từ PostgreSQL và gọi application/domain command dùng chung.

## 2. Nguyên tắc tin cậy

- PostgreSQL là source of truth; Redis có thể mất hoàn toàn.
- BullMQ thực thi at-least-once; idempotency ngăn side effect trùng.
- Job payload chứa ID/version, không chứa toàn bộ state/PII.
- Mỗi job reload DB state và bỏ qua nếu deadline/alert version stale.
- Không gọi provider trong DB transaction.
- `provider accepted` chỉ là `sent`; `delivered` cần receipt/webhook nếu provider hỗ trợ.
- Notification delivery và alert acknowledgement là hai khái niệm khác nhau.
- Reconciliation phải có thể dựng lại queue mà không gửi trùng.

## 3. Timeline và job taxonomy

Timeline mặc định cho chu kỳ 36 giờ:

```text
24h  reminder.soft.push
32h  reminder.urgent.push
35h  reminder.final.push + reminder.final.email.user
36h  alert.trigger + alert.notify.contact.priority1
38h  alert.escalate.remaining-contacts khi chưa acknowledged
```

Không hard-code các mốc trong processor. Dùng versioned policy từ domain/config.

Queue/job đề xuất:

```text
safety-schedule
  schedule.reminder
  schedule.alert-trigger
  schedule.alert-escalation
  schedule.snooze-end

notifications
  notification.dispatch
  notification.receipt-check
  notification.correction

maintenance
  reconciliation.run
  outbox.publish
  delivery.recover-stuck
```

Stable job ID/idempotency key nên bao gồm business action, resource/version, recipient và channel; không dùng random ID làm cơ chế duy nhất.

## 4. Provider contract

```ts
type NotificationChannel = 'push' | 'email' | 'sms' | 'voice';

interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: OutboundNotification): Promise<ProviderResult>;
}
```

`NotificationDispatcher` chọn provider theo channel/config. Alert/scheduler không import Expo/Nodemailer.

Provider kết quả phân biệt:

- Accepted/sent.
- Delivered/receipt-confirmed nếu có.
- Transient failure có thể retry.
- Permanent failure không retry.
- Unknown khi outcome không chắc chắn; không gửi lại mù quáng nếu có nguy cơ duplicate.

Mỗi `notification_delivery` cần:

- ID và unique idempotency key.
- Channel/provider/recipient reference.
- Alert/step/template key + template version.
- Status `queued | sent | delivered | failed | unknown`.
- Attempt count/timestamps/provider message ID.
- Sanitized error code/detail và correlation ID.

## 5. Giai đoạn triển khai

### WN1 — Worker foundation

- [ ] Scaffold worker app, env validation, logging và health/heartbeat.
- [ ] BullMQ connection/queue/processor conventions.
- [ ] Graceful shutdown và in-flight job behavior.
- [ ] Fake clock và queue test harness.
- [ ] Job ID/idempotency/stale-version conventions.
- [ ] Metrics cho queue depth, lag, duration, retry và failure.

Exit: worker restart không mất tracking job; test không dùng sleep thật.

### WN2 — Scheduling và outbox publishing

- [ ] Consume outbox/scheduling intents sau transaction commit.
- [ ] Tạo reminder/trigger/escalation jobs từ versioned policy.
- [ ] Check-in/plan update làm old jobs stale bằng version, không phụ thuộc xóa queue thành công.
- [ ] Job handler reload safety plan/alert và validate deadline/version.
- [ ] Alert trigger command transaction-safe.
- [ ] Snooze-end scheduling và resume command.

Exit: check-in gần deadline không để old trigger job tạo alert sai.

### WN3 — Reconciliation

- [ ] Tìm active plan thiếu reminder/trigger jobs.
- [ ] Tìm triggered alert thiếu escalation jobs.
- [ ] Tìm stale/terminal resource jobs để bỏ qua/cleanup an toàn.
- [ ] Tìm delivery stuck và outbox chưa publish.
- [ ] Batch/cursor/lock để nhiều reconciliation instance không tranh chấp.
- [ ] Metric repair count, scan duration và unrecoverable anomalies.
- [ ] Test xóa Redis hoàn toàn rồi dựng lại.

Exit: PostgreSQL đủ để khôi phục queue mà không gửi trùng delivery đã ghi nhận.

### WN4 — Dispatcher và fake/disabled providers

- [ ] `NotificationDispatcher` và provider registry.
- [ ] Fake push/email providers ghi request cho test.
- [ ] SMS/voice disabled providers trả explicit unsupported/disabled result, không network call.
- [ ] Delivery create/update transaction và unique idempotency.
- [ ] Timeout, retry classification và exponential backoff.
- [ ] Dead-letter/failed job inspection path.

Exit: API→DB→queue→worker→fake provider integration test xanh.

### WN5 — Expo Push

- [ ] Build Expo message từ versioned template data.
- [ ] Batch trong giới hạn provider và map ticket theo delivery.
- [ ] Retry transient errors; không retry invalid token.
- [ ] Receipt check và update sent/delivered/failed/unknown.
- [ ] Disable device token bị báo invalid.
- [ ] Không đưa data nhạy cảm vào lock-screen payload.

Exit: nhiều device token/user, invalid token và partial batch failure được test.

### WN6 — Gmail email

- [ ] `GmailEmailProvider` qua Nodemailer.
- [ ] Secret chỉ từ environment/secret manager.
- [ ] Text + HTML templates, escaped dynamic content, absolute HTTPS link.
- [ ] Versioned template cho invitation, reminders, alert, escalation, correction và drill.
- [ ] Subject/body phân biệt drill với alert thật.
- [ ] Timeout và transient/permanent SMTP error mapping.
- [ ] Gmail accepted → sent, không đánh dấu read/delivered nếu không có bằng chứng.
- [ ] Smoke script chỉ chạy khi có explicit env flag/test recipient.

Exit: default tests không gửi Gmail thật; duplicate job không tạo duplicate email delivery.

### WN7 — Alert escalation và correction

- [ ] Notify priority contact khi alert triggered.
- [ ] Escalate remaining contacts khi chưa acknowledged theo policy.
- [ ] Job reload allowed recipients/status trước dispatch.
- [ ] Dừng escalation khi alert terminal/acknowledged theo policy.
- [ ] Correction notification khi user check-in/cancel sau khi contact đã được báo.
- [ ] Audit/delivery/correlation linkage đầy đủ.

### WN8 — Operations hardening

- [ ] Dashboard/alerts cho worker heartbeat, queue lag, overdue jobs, provider failure và reconciliation anomalies.
- [ ] Runbook Redis loss, provider outage, queue backlog, unknown delivery và dead-letter.
- [ ] Load/backpressure test.
- [ ] Graceful deploy/rollback và compatibility với schema versions.
- [ ] Provider kill switch không tắt audit/reconciliation.

## 6. Retry policy

- Retry chỉ cho lỗi transient: timeout, rate limit, provider 5xx/network.
- Tôn trọ `Retry-After` nếu có.
- Dùng exponential backoff + jitter và giới hạn attempt.
- Permanent error: invalid recipient/token, authentication/config invalid, template data invalid.
- Config/auth provider failure phải alert operator; không retry vô hạn.
- Outcome unknown cần provider-specific reconciliation trước khi resend.

## 7. Kiểm thử

Unit:

- Policy-to-job calculation.
- Stable idempotency/job key.
- Stale job detection.
- Provider error classification/template escaping.

Integration:

- API/outbox→queue→worker→fake provider.
- Concurrent workers cùng job.
- Worker crash trước/sau provider call và delivery write.
- Check-in trong khi trigger job đang chạy.
- Redis loss/reconciliation.
- Priority contact timeout/escalation/correction.
- Push partial batch/invalid token; Gmail timeout/accepted/unknown.

Smoke:

- Expo test device và Gmail test mailbox chỉ ở staging với explicit flag.
- Full accelerated 36-hour equivalent flow.

## 8. Definition of Done

- Không phụ thuộc app đang mở.
- PostgreSQL có đủ state để dựng lại queue.
- Mọi job có stale check, idempotency, retry classification và metric.
- Provider tách qua adapter; SMS/voice không gửi request trong MVP.
- Delivery status không bị nhầm với alert acknowledgement.
- Worker restart/Redis loss/provider failure/duplicate attempt được test.
- Runbook và monitoring đủ để operator phát hiện/mịnh bạch sự cố.

## 9. Bước tiếp theo

1. Chốt ADR queue/outbox/idempotency/provider.
2. Chờ schema và worker scaffold từ Plan 03/05.
3. Implement WN1→WN4 với fake providers trước khi nối Expo/Gmail.

