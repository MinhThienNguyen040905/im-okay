# ADR 0010 — Contact, alert và notification workflows S3

- Trạng thái: Accepted
- Ngày: 2026-08-04
- Phạm vi: trusted contacts, public token, alert state machine, provider dispatch, contact web và account workflow

## Bối cảnh

S2 dừng ở authoritative check-in, scheduler intent và queue recovery. S3 phải hoàn tất chuỗi
invitation → alert → response → correction mà không biến provider, public link hoặc mobile thành
source of truth. Các rủi ro chính là token bị lộ/tái sử dụng, request đồng thời tạo transition trùng,
provider timeout không rõ kết quả, và trạng thái `sent`/`delivered` bị hiểu nhầm là contact đã phản hồi.

## Quyết định

### Contact và public token

- Mỗi user có tối đa ba trusted contacts; email được chuẩn hóa trước khi kiểm tra duplicate.
- Priority là một tập liên tục và reorder toàn bộ chạy trong một transaction với deferred constraint.
- Invitation và alert response chỉ lưu SHA-256 digest. Raw token có entropy cao, scope/expiry/revoke
  riêng và chỉ xuất hiện khi dispatcher claim một delivery cần tạo public URL.
- Public `GET` chỉ trả projection, không consume hay đổi state. Public `POST` khóa row và consume
  action/idempotency atomically. Resend có cooldown và vô hiệu token cũ.
- Edge public áp dụng origin allowlist, `no-store`, `no-referrer`, `noindex` và CSP; logger scrub
  authorization, token URL, email và notification body.

### Alert state machine

- PostgreSQL giữ single-active-alert constraint và các transition hợp lệ cho deadline, SOS, drill,
  acknowledge, resolve, cannot-help, cancel và correction.
- `sent` hoặc `delivered` chỉ là delivery state, không tự acknowledge/resolve alert.
- `cannot_help` atomically queue contact ưu tiên kế tiếp nhưng giữ alert ở `triggered`.
- Snooze luôn có thời điểm kết thúc; SOS và drill dùng source khác nhau. Drill không được trình bày
  như cảnh báo thật trong projection/history.
- Check-in/cancel sau khi một contact đã được gửi cảnh báo queue đúng một correction cho từng contact
  liên quan và audit kết quả.

### Dispatcher và provider

- Domain transaction chỉ ghi delivery intent. Edge consumer claim theo lease rồi mới gọi provider
  ngoài transaction.
- Stable delivery key được truyền thành idempotency key cho email. Outcome được phân loại
  `sent`, `transient`, `permanent` hoặc `unknown`; transient/unknown retry bằng exponential backoff,
  terminal outcome dừng retry.
- Expo ticket và receipt được theo dõi riêng. Receipt `DeviceNotRegistered` vô hiệu device token.
- Local/CI mặc định dùng fake provider và không gửi mạng. Resend/Expo chỉ được bật khi
  `NOTIFICATION_PROVIDER_MODE=live` cùng secrets phía server.

### API, contact web và account workflow

- Authenticated Edge router chỉ nhận actor từ JWT đã xác minh; RPC internal dùng service role nhưng
  tự enforce actor/scope và không cấp execute cho `anon`/`authenticated`.
- Contact web dùng route `/invitations/[token]` và `/alerts/[token]`; W02–W05 là các bước tương tác
  trên cùng alert route để không đặt token vào analytics hoặc cross-app navigation.
- History/settings là safe projection. Disable/export/deletion yêu cầu JWT có auth time không quá
  15 phút ở Edge boundary; request có idempotency và audit.

## Hệ quả

- Database và delivery log đủ để dựng lại retry/escalation mà không dựa vào provider response tức thời.
- Raw token không thể khôi phục từ database; resend/retry phải rotate token trước lúc dispatch.
- Fake-provider integration chứng minh state machine nhưng không chứng minh deliverability, sender
  reputation, device receipt, hosted Cron hay browser/device accessibility.
- S4 vẫn phải deploy staging, cấu hình secrets/domain/kill switch, chạy provider thật với người nhận
  đã consent và thực hiện visual/accessibility/security/resilience gates.
