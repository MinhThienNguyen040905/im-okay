# ADR 0012 — Gmail SMTP tạm thời cho personal pilot

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Phạm vi: email provider, Supabase Auth SMTP, staging/personal pilot và đường nâng cấp sender
- Thay thế một phần: lựa chọn Resend mặc định trong ADR 0008 và ADR 0010 cho giai đoạn personal pilot

## Bối cảnh

I’m Okay hiện chỉ phục vụ owner và một số người thân đã đồng ý tham gia thử nghiệm. Owner chưa có
domain riêng và không muốn phát sinh chi phí trước khi chứng minh luồng cảnh báo. Resend testing
domain không đủ cho email invitation/alert tới nhiều người nhận, trong khi mua domain chỉ để đóng
staging gate là chưa phù hợp với phạm vi hiện tại.

Thay đổi provider không được làm mất transaction, outbox, retry, correction, audit hoặc kill switch.
Mật khẩu Gmail thường không được dùng; App Password phải tách khỏi source, client và log.

## Quyết định

### Provider selection

- Giữ `NotificationProvider`/`EmailProvider` làm boundary; domain và database không import Gmail hay
  Nodemailer.
- `EMAIL_PROVIDER=gmail_smtp` chọn Gmail SMTP cho personal pilot. Endpoint cố định
  `smtp.gmail.com:465`, TLS và timeout 10 giây.
- Resend adapter và `EMAIL_PROVIDER=resend` tiếp tục tồn tại để chuyển sang verified-domain provider
  mà không đổi state machine, database hay public contract.
- Local/CI tiếp tục dùng fake provider. `NOTIFICATION_DELIVERY_ENABLED=false` là mặc định hosted cho
  đến khi sender, recipients và device được xác nhận rõ.

### Credential boundary

- Dùng một Google account riêng cho I’m Okay, bật 2-Step Verification.
- Tạo hai App Password khác nhau: một cho Supabase Auth custom SMTP, một cho Edge notification
  provider. Thu hồi một credential không bắt buộc làm gián đoạn luồng còn lại.
- Edge chỉ đọc `GMAIL_SMTP_USERNAME`, `GMAIL_SMTP_APP_PASSWORD` và `GMAIL_SMTP_FROM` từ Supabase
  project secrets. Auth SMTP credential chỉ nhập trực tiếp trong Supabase Dashboard.
- Không đưa App Password vào chat, command history, `.env`, migration, Vault query, screenshot hay
  evidence. Không dùng mật khẩu Google account thông thường.

### Delivery semantics và giới hạn

- Mỗi SMTP message dùng deterministic `Message-ID` và header chứa SHA-256 delivery key; không đưa raw
  business key vào email header.
- SMTP 4xx là transient, 5xx/auth/recipient rejection là permanent, còn network outcome không rõ là
  `unknown`; dispatcher/reconciliation hiện hành tiếp tục ghi audit và retry theo delivery state.
- SMTP không có provider idempotency guarantee tương đương Resend HTTP idempotency key. Kết nối rớt
  sau khi Gmail đã nhận DATA có thể tạo email trùng khi retry. Đây là known limitation được chấp nhận
  chỉ cho supervised personal pilot; nó vẫn block beta/production rộng.
- Gmail quota, anti-abuse và sender reputation không phải SLO của I’m Okay. Provider `sent` không có
  nghĩa người nhận đã đọc hoặc contact đã acknowledge.

## Đường nâng cấp bắt buộc

Trước khi mở thử nghiệm rộng hoặc production:

1. Mua/dùng domain do owner kiểm soát và verify SPF/DKIM với transactional email provider.
2. Chuyển `EMAIL_PROVIDER` sang `resend` hoặc HTTP provider được ADR sau chấp thuận.
3. Chạy lại invitation→alert→correction, unknown outcome, retry/dedupe và deliverability acceptance.
4. Rotate/xóa Edge Gmail App Password; quyết định riêng có tiếp tục dùng Gmail cho Supabase Auth hay
   chuyển Auth SMTP sang verified-domain provider.
5. Cập nhật runbook, evidence và ADR trước release gate.

## Hệ quả

- Personal pilot có đường gửi email không cần mua domain và không thêm backend ngoài Supabase.
- Provider change chỉ nằm ở adapter/config; Vercel contact web, Edge API, PostgreSQL, Cron/Queues và
  mobile contract không đổi.
- App Password và SMTP unknown-outcome làm tăng rủi ro vận hành; delivery phải được bật có giám sát,
  recipient phải consent và kill switch phải sẵn sàng.
- Config/code/test không chứng minh Gmail deliverability. S4 chỉ đóng sau smoke thật có evidence và
  delivery được tắt lại khi kết thúc supervised test.

## Tài liệu nền tảng

- [Google App Passwords](https://support.google.com/accounts/answer/185833)
- [Gmail sending limits](https://support.google.com/mail/answer/22839)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
