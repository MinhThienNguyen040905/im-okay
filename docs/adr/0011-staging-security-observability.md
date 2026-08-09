# ADR 0011 — Staging security và observability S4

- Trạng thái: Accepted
- Ngày: 2026-08-09
- Phạm vi: rate limit, provider kill switch, hosted worker scheduling, operational signals và staging deploy

## Bối cảnh

S1–S3 đã chứng minh domain flow bằng local database và fake provider, nhưng hosted Supabase không tự
gọi `notification-consumer`/`provider-receipts`. Public token endpoints cũng chưa có distributed rate
limit và operator chưa có projection an toàn để nhìn scheduler lag, queue backlog hoặc dead letter.
S4 phải bổ sung các cơ chế này trước khi gửi notification thật.

## Quyết định

- Dùng fixed-window counter atomic trong PostgreSQL cho app/public API. Bucket chỉ lưu SHA-256 của
  salt + địa chỉ ingress + actor class, không lưu IP/token thô. Supabase Auth rate limits vẫn cấu hình
  riêng cho login/OTP; app limiter không thay thế lớp Auth.
- `NOTIFICATION_DELIVERY_ENABLED` là kill switch độc lập. Live mode chỉ claim/gọi provider khi biến
  này bằng `true`; tắt switch giữ delivery ở queue để xử lý lại, không giả lập `sent`.
- PostgreSQL Cron tiếp tục chạy authoritative scheduler bằng SQL. Hai hosted jobs dùng `pg_net` gọi
  notification consumer mỗi phút và Expo receipt poller mỗi năm phút.
- URL, publishable key và internal worker secret của Cron nằm trong Supabase Vault. Migration chỉ tạo
  job no-op khi Vault chưa cấu hình; không hard-code environment value trong SQL.
- Edge Function `ops` chỉ nhận internal secret và trả aggregate operational snapshot: heartbeat,
  cron failures, intent/outbox/queue depth, overdue alert, retry/dead-letter và receipt backlog.
  Projection không chứa user/contact/token/recipient/provider body.
- Deploy script mặc định chỉ link + migration dry-run. Apply cần explicit `-Apply` và
  `S4_DEPLOY_CONFIRMATION=staging`; contact-web hosting/provider secrets vẫn là bước tách biệt.

## Hệ quả

- Nhiều Edge isolate chia sẻ cùng limiter state và operator có thể phát hiện missing/overdue work mà
  không cần quyền đọc PII.
- Fixed window đơn giản hơn token bucket và có thể từ chối burst ở ranh giới; staging phải đo trước
  khi hiệu chỉnh limit, không coi con số ban đầu là SLO sản phẩm.
- Vault secrets được sao lưu theo database; restore sang project khác phải tuân theo hướng dẫn root
  key/restore của Supabase và worker phải giữ disabled cho đến khi kiểm tra target.
- Repository readiness không phải staging acceptance. Project/domain/provider/device/backup evidence
  vẫn phải được ghi riêng trước khi đóng S4.
