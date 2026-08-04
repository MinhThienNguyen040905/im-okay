# ADR 0005 — Mobile warning, snooze, SOS và drill authoritative

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, M09/M10

> Cập nhật 2026-08-04: dependency worker/OpenAPI cũ được ánh xạ sang Supabase Edge
> Functions, Cron/Queues và versioned contracts theo ADR 0008. Hành vi MA5 không đổi.

## Bối cảnh

MA5 đưa vào các hành động có thể làm thay đổi quy trình cảnh báo: check-in từ warning, snooze,
SOS và drill. Backend S3, scheduler/queue consumer và provider chưa tồn tại trong repository.
Client không được
tự chuyển alert state, tự hứa notification đã gửi hoặc hiển thị SOS thành công chỉ vì người dùng
giữ nút đủ ba giây.

## Quyết định

- `GET /v1/alerts/current` trả một alert-context projection có `serverTime`, plan/deadline,
  contact eligibility, channel summary, current alert và allowed actions. Current alert luôn có
  `source` là `deadline | sos | drill`, state domain, delivery status và correction status.
- Countdown chỉ lấy timestamp từ projection và server-clock offset. Khi countdown về 0, mobile
  khóa snooze và refetch; không tự chuyển thành `triggering` hoặc tuyên bố notification đã gửi.
- M09 dùng cùng `useAuthoritativeCheckIn` và persisted idempotency key với M06. Check-in
  response có `lastAlertOutcome`: `cancelled_before_notification`, `correction_queued` hoặc
  `correction_sent`. Mobile chỉ hiển thị correction state do server trả về.
- Snooze chỉ nhận preset 1/4/8 giờ. `POST /v1/safety-plan/snooze` dùng `Idempotency-Key` và
  phải trả projection có `plan.state=snoozed` cùng exact `snoozedUntil`; client không cộng giờ để
  tạo thời điểm production và không có tùy chọn vô thời hạn.
- SOS và drill đều dùng persisted idempotency key riêng. Success chỉ xuất hiện sau response đã
  qua Zod và đúng source. `queued`/`sent` là delivery state, không đồng nghĩa contact đã đọc,
  acknowledged hoặc đang xử lý.
- SOS không có one-tap handler. Control chính yêu cầu press-in liên tục ba giây, có progress,
  thả tay/app background để hủy và rung ngắn khi guard hoàn tất; không continuous vibration.
  Alternative accessibility là hai bước rõ ràng, trong đó bước hai mới gọi mutation.
- Khi không có contact đã xác nhận hoặc server không cho phép, SOS/drill bị khóa. Contact count,
  names và channels đều lấy từ projection; không hard-code recipient/provider trong UI.
- Drill nằm ở route riêng, luôn có badge/copy `DIỄN TẬP · KHÔNG PHẢI SOS`, cần hai bước xác
  nhận và API response phải có `source=drill`.
- M10 không hứa gọi dịch vụ cứu hộ hoặc chia sẻ vị trí. Copy chỉ nói I’m Okay hỗ trợ gửi yêu
  cầu tới các liên hệ tin cậy.
- `features/alerts/fixtureApi.ts` là fake server local. Nó có fake clock, idempotent replay,
  finite snooze, distinct SOS/drill source và correction outcome để test nhưng không gửi push,
  email hoặc gọi dịch vụ thật. UI luôn hiển thị fixture warning.

## Hệ quả

- MA5 client có thể kiểm thử gesture, states và contract trước backend nhưng không phải bằng
  chứng end-to-end rằng cảnh báo hoạt động khi app đóng.
- Remote acceptance còn phụ thuộc S2–S4, outbox/Cron/Queues/reconciliation, Expo/email
  adapters, confirmed contacts, contract compatibility và accelerated alert E2E trên staging.
- Backend phải quyết định transition, allowed actions, exact snooze end và correction. Nếu
  versioned contract chọn field khác, adapter/schema/ADR cần được cập nhật cùng thay đổi.
