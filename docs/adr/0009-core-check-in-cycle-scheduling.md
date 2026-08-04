# ADR 0009 — Core check-in cycle và scheduling S2

- Trạng thái: Accepted
- Ngày: 2026-08-04
- Phạm vi: profile/device, safety plan, check-in transaction, deadline, Cron, outbox và PGMQ

## Bối cảnh

S1 chỉ có schema foundation, heartbeat Cron và queue rỗng. S2 cần cho mobile onboarding/check-in
chạy với backend thật, đồng thời phải ngăn request đồng thời hoặc queue message cũ tạo chu kỳ và
cảnh báo sai. App không được tự tính deadline hoặc coi timeout/offline là thành công.

## Quyết định

### Deadline và cycle anchor

Database function duy nhất áp dụng:

```text
nextDeadlineAt = lastCheckInAt + checkInInterval
```

Lần kích hoạt đầu tiên tạo một check-in `source=system` để ghi rõ cycle anchor. Đổi interval giữ
anchor đã được chấp nhận gần nhất và tính lại deadline; nó không giả lập một mobile check-in mới.
Mỗi activate/update/check-in tăng `safety_plans.resource_version`, tạo đúng một scheduled alert và
năm scheduling intent mang resource/policy version đó.

Policy version 1 dùng cùng quan hệ với deadline cho cả ba preset:

| Bước       | 24 giờ | 36 giờ | 48 giờ |
| ---------- | -----: | -----: | -----: |
| Nhắc nhẹ   |    12h |    24h |    36h |
| Nhắc gấp   |    20h |    32h |    44h |
| Nhắc cuối  |    23h |    35h |    47h |
| Deadline   |    24h |    36h |    48h |
| Escalation |    26h |    38h |    50h |

Nói cách khác: nhắc nhẹ `deadline - 12h`, nhắc gấp `deadline - 4h`, nhắc cuối
`deadline - 1h`, trigger tại deadline và escalation `deadline + 2h`. Policy nằm trong bảng versioned,
không rải magic number ở Edge handler hoặc queue consumer.

### Transaction và idempotency

- Edge xác minh user JWT và không nhận actor ID từ body.
- Edge dùng service role chỉ để gọi nhóm `internal_*` RPC; `authenticated` không có quyền execute
  các RPC này hoặc update trực tiếp bảng domain. RPC tự kiểm tra actor/account scope.
- Check-in lock safety-plan row, kiểm tra account/plan, ghi unique idempotency key, cập nhật deadline,
  cancel/stale cycle cũ, tạo cycle mới, audit và outbox trong cùng transaction.
- Response projection đầu tiên được lưu cùng check-in. Retry cùng key trả lại đúng projection cũ;
  không dùng server time mới để tạo cảm giác có check-in thứ hai.

### Cron, queue và recovery

- Một Cron job theo phút scan intent đến hạn theo batch bằng `FOR UPDATE SKIP LOCKED`; không có
  cron job riêng cho từng user.
- Due intent tạo outbox có stable business key, sau đó publish vào `notification_jobs`.
- Consumer claim bằng PGMQ visibility timeout, reload plan/alert hiện tại và so resource/policy
  version trước khi chuyển `scheduled → warning → triggering`.
- Check-in mới làm intent cũ stale. Message cũ vẫn được archive nhưng không thể đổi alert mới.
- Reconciliation tìm queued intent không còn message và dựng lại outbox/queue từ PostgreSQL.
  Lease hết hạn cho phép invocation sau claim lại; completed/stale state giữ xử lý idempotent.

S2 chưa gọi provider. Push/email, `triggered`, contact escalation, retry/provider outcome và correction
được hoàn thiện ở S3, bên ngoài database transaction.

## Hệ quả

- App đóng vẫn không làm mất deadline/due work vì Cron và state đều ở backend.
- Queue có thể xóa và dựng lại mà không thay source of truth hoặc tạo alert cycle mới.
- Interval update có thể đưa deadline gần hơn nếu anchor cũ đã lâu; projection server phải hiển thị
  kết quả chính xác và client không được suy đoán deadline dễ chịu hơn.
- Staging vẫn phải đo scheduler lag và diễn tập provider/function outage trước production.
