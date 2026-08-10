# I’m Okay — Staging operations runbook

Runbook này triển khai và nghiệm thu S4. Chỉ dùng project, domain, sender, tài khoản và thiết bị dành
riêng cho staging. Không dùng dữ liệu cá nhân hoặc contact chưa consent.

## 1. Thông tin bắt buộc trước khi deploy

Ghi vào evidence, không commit secret:

- Supabase organization/project ref, region và plan staging đã được owner chấp thuận.
- HTTPS contact-web domain và hosting provider đã chọn.
- Auth site URL, `imokay://**` redirect và Google OAuth redirect staging.
- Dedicated Gmail account cho personal pilot, hai App Password tách biệt và danh sách test recipients
  đã consent. Verified-domain provider vẫn là gate trước triển khai rộng.
- Android/iOS test device và Expo project/build ID.
- Người phụ trách go/hold/rollback và incident contact.

CLI phải đăng nhập bằng `npx supabase login` của operator. Không dán token, database password, secret key,
Google App Password, Resend key hoặc internal secret vào issue/chat/log.

## 2. Deploy theo thứ tự expand-first

1. Chạy quality/local integration đầy đủ và tạo backup checkpoint nếu staging đã có dữ liệu.
2. Đặt Edge secrets với provider đang tắt:

   ```text
   NOTIFICATION_PROVIDER_MODE=live
   NOTIFICATION_DELIVERY_ENABLED=false
   INTERNAL_FUNCTION_SECRET=<random secret riêng staging>
   RATE_LIMIT_HASH_SALT=<random salt riêng staging>
   PUBLIC_CONTACT_WEB_URL=https://<contact-domain>
   PUBLIC_CONTACT_WEB_ORIGINS=https://<contact-domain>
   EMAIL_PROVIDER=gmail_smtp
   GMAIL_SMTP_USERNAME=<dedicated Gmail account>
   GMAIL_SMTP_APP_PASSWORD=<App Password riêng cho Edge notifications>
   GMAIL_SMTP_FROM=I’m Okay <dedicated-account@gmail.com>
   ```

   `GMAIL_SMTP_APP_PASSWORD` không phải mật khẩu Google account thường và phải khác App Password
   dùng cho Supabase Auth custom SMTP. Nhập các giá trị trực tiếp trong Dashboard; không đặt secret
   vào command history hoặc file trong repository. Khi có verified domain, đổi `EMAIL_PROVIDER=resend`
   và cấu hình `RESEND_API_KEY`/`RESEND_FROM` theo ADR 0012.

3. Review migration dry-run:

   ```powershell
   npx supabase login # chỉ cần khi CLI chưa đăng nhập trên máy
   .\scripts\deploy-staging.ps1 -ProjectRef '<project-ref>'
   ```

4. Sau khi review target/diff/backup, apply backend:

   ```powershell
   $env:S4_DEPLOY_CONFIRMATION = 'staging'
   .\scripts\deploy-staging.ps1 -ProjectRef '<project-ref>' -Apply
   ```

5. Deploy contact web với `EXPO_PUBLIC_PUBLIC_API_URL` trỏ tới
   `https://<project-ref>.supabase.co/functions/v1/public-api`. Xác minh hosting thực sự áp dụng
   privacy headers tương ứng (`_headers` hoặc `vercel.json`); SPA fallback phải giữ token route nhưng
   không log URL ở analytics. Repository hiện dùng Vercel project `im-okay-contact-staging` và alias
   `https://im-okay-contact-staging.vercel.app` cho staging.
6. Cấu hình mobile preview environment bằng publishable values; tuyệt đối không đưa secret key vào
   `EXPO_PUBLIC_*`.

### Gmail account và hai App Password

1. Dùng một Google account riêng cho I’m Okay, bật 2-Step Verification và tạo hai App Password có
   nhãn khác nhau, ví dụ `Im Okay Auth` và `Im Okay Edge Alerts`.
2. Trong Supabase Dashboard → Authentication → Emails → SMTP Settings, bật custom SMTP và nhập trực
   tiếp credential `Im Okay Auth`: sender/username là dedicated Gmail account, host `smtp.gmail.com`,
   port `465`, password là Auth App Password. Không chụp hoặc copy password vào evidence.
3. Trong Supabase Dashboard → Edge Functions → Secrets, dùng credential `Im Okay Edge Alerts` cho
   `GMAIL_SMTP_APP_PASSWORD`; đặt `GMAIL_SMTP_USERNAME` và `GMAIL_SMTP_FROM` cùng dedicated account.
4. Không dùng lại một App Password cho cả Auth và Edge. Nếu một credential bị lộ hoặc bị thu hồi, giữ
   credential còn lại độc lập và thay đúng secret tương ứng.

## 3. Cấu hình Vault cho hosted workers

Trong Supabase Dashboard → Vault, tạo đúng ba secret name sau:

| Name                              | Value                                             |
| --------------------------------- | ------------------------------------------------- |
| `imokay_staging_project_url`      | `https://<project-ref>.supabase.co`               |
| `imokay_staging_publishable_key`  | publishable key của staging                       |
| `imokay_internal_function_secret` | cùng giá trị `INTERNAL_FUNCTION_SECRET` phía Edge |

Vault mã hóa secret trên disk. Chỉ kiểm tra tên/updated time; không query hoặc chụp màn hình cột
`decrypted_secret`. Cron jobs `imokay-notification-consumer` và `imokay-provider-receipts` sẽ no-op
cho đến khi đủ ba secret.

## 4. Preflight không gửi notification

Đặt biến local ngoài repository rồi chạy:

```powershell
$env:STAGING_SUPABASE_URL = 'https://<project-ref>.supabase.co'
$env:STAGING_SUPABASE_PUBLISHABLE_KEY = '<publishable key>'
$env:STAGING_CONTACT_WEB_URL = 'https://<contact-domain>'
$env:STAGING_INTERNAL_FUNCTION_SECRET = '<internal secret>'
npm run staging:preflight
```

Preflight kiểm tra HTTPS, public/API health, unauthenticated rejection, exact CORS origin, public web
privacy headers, ops projection và 10 latency samples. Nó không mutate domain và không gọi provider.

### Hosted security smoke

Smoke này tạo hai auth user tổng hợp có domain `.test`, không gửi email, chạy JWT/actor-binding/IDOR/RLS
negative cases rồi xóa cả hai user trong `finally`. Chỉ lấy secret key từ CLI hoặc secret manager vào
biến môi trường tạm; không ghi key vào script, terminal history hoặc evidence.

```powershell
$env:S4_SECURITY_SMOKE_CONFIRMATION = 'staging'
$env:STAGING_EXPECTED_PROJECT_REF = '<project-ref>'
$env:STAGING_SUPABASE_URL = 'https://<project-ref>.supabase.co'
$env:STAGING_SUPABASE_PUBLISHABLE_KEY = '<publishable key>'
$env:STAGING_SUPABASE_SECRET_KEY = '<secret key>'
npm run staging:security-smoke
Remove-Item Env:STAGING_SUPABASE_SECRET_KEY
```

Xác minh dòng cleanup pass, sau đó xóa các biến secret khỏi process hiện tại.

### Observability snapshot

Lệnh này không mutate domain và không gọi provider. Nó lấy 10–100 health samples cùng aggregate ops
snapshot đã scrub để đo latency/error, heartbeat, Cron failure, overdue work, queue/outbox/retry/dead-letter.

```powershell
$env:S4_OBSERVABILITY_CONFIRMATION = 'staging'
$env:S4_OBSERVABILITY_SAMPLES = '30'
$env:STAGING_EXPECTED_PROJECT_REF = '<project-ref>'
$env:STAGING_SUPABASE_URL = 'https://<project-ref>.supabase.co'
$env:STAGING_SUPABASE_PUBLISHABLE_KEY = '<publishable key>'
$env:STAGING_SUPABASE_SECRET_KEY = '<secret key>'
npm run staging:observability
Remove-Item Env:STAGING_SUPABASE_SECRET_KEY
```

Một snapshot xanh chỉ đóng bước đo tức thời; chưa đủ để tự chốt SLO hoặc alert threshold dài hạn.

## 5. Bật provider và accelerated acceptance

Chỉ đổi `NOTIFICATION_DELIVERY_ENABLED=true` khi test user/contact/device đã consent và preflight
xanh. Trước khi review giá trị và bật delivery, chạy guard chỉ đọc tên secret sau; lệnh không in giá
trị secret, không gọi provider và không thay đổi kill switch:

```powershell
$env:STAGING_EXPECTED_PROJECT_REF = '<project-ref>'
$env:S4_EMAIL_PROVIDER = 'gmail_smtp'
$env:S4_EMAIL_SENDER_CONFIRMED = 'true'
$env:S4_PROVIDER_RECIPIENTS_CONSENTED = 'true'
$env:S4_PROVIDER_DEVICE_CONSENTED = 'true'
npm run staging:provider-readiness
```

Guard chỉ chứng minh đủ tên secret và có explicit confirmation. Operator vẫn phải review thủ công
`NOTIFICATION_PROVIDER_MODE=live`, `NOTIFICATION_DELIVERY_ENABLED=false`, `EMAIL_PROVIDER=gmail_smtp`,
`GMAIL_SMTP_FROM` khớp dedicated Gmail account và Edge App Password tách khỏi Auth App Password trước
smoke. Không dùng email từng nhận Auth magic link như bằng chứng consent cho alert.

Dùng một test account riêng; không sửa policy production. Để chạy nhanh, tạo cycle cho test
account với authoritative timestamps trong quá khứ ở isolated staging transaction, sau đó chạy
scheduler/consumer theo các mốc tương đương 24h → 32h → 35h → 36h → 38h. Ghi correlation ID,
delivery ID/provider ID đã scrub và timestamp thực nhận; không ghi raw link token.

Acceptance tối thiểu:

- Email invitation nhận được và W01 accept/decline/concurrent submit đúng.
- Push gentle/urgent và final user email; Expo ticket chỉ là `sent`, receipt mới là `delivered`.
- Contact ưu tiên 1 nhận alert; không phản hồi thì escalation; `cannot_help` handoff đúng.
- Contact acknowledge/resolve; delivery không tự transition alert.
- User check-in sau notification tạo correction đúng một lần.
- SOS và drill có copy/source riêng; accidental tap không gửi.

Sau smoke, tắt provider nếu chưa bắt đầu supervised testing.

Gmail SMTP không có HTTP idempotency guarantee. Deterministic Message-ID hỗ trợ correlation nhưng
không bảo đảm Gmail dedupe khi kết nối rớt sau DATA; vì vậy mọi `unknown`/retry phải được kiểm tra email
trùng trong supervised smoke. Không dùng Gmail SMTP để đóng beta/production provider gate.

## 6. Fault drills

- Function termination: dừng invocation sau claim, chờ lease rồi invoke lại; không duplicate side effect.
- Queue loss: xóa message test, chạy reconciliation và xác minh cùng business key được dựng lại.
- Provider outage: dùng test adapter/invalid endpoint được kiểm soát; xác minh transient/unknown,
  exponential retry, dead letter và kill switch.
- Receipt failure: dùng token test hết hạn và xác minh `DeviceNotRegistered` disable token.
- Public security: RLS/IDOR/JWT/origin/token/rate-limit negative matrix; response không phân biệt token
  không tồn tại với token sai theo cách hỗ trợ enumeration.

## 7. Monitoring và incident actions

Gọi Edge `ops` bằng internal secret để xem aggregate snapshot. Theo dõi thêm Supabase Function
Invocations/Logs, Cron run history và provider dashboards. Ban đầu cảnh báo ngay khi có
`overdueUntriggered > 0`, cron failure hoặc dead letter; queue age/latency threshold chỉ chốt sau khi
có số đo staging.

- Provider outage hoặc Google account bị khóa: đặt `NOTIFICATION_DELIVERY_ENABLED=false`, giữ queue,
  xác định unknown outcomes
  trước khi bật lại.
- Scheduler/Cron outage: giữ provider state, chạy reconciliation, so deadline/alert/audit theo
  correlation ID.
- Public-token incident: tắt public route tại hosting/Edge nếu cần, revoke affected token digest,
  rotate secrets và giữ audit.
- Migration fail: dừng client rollout; rollback function code tương thích, không rollback migration
  phá dữ liệu.

## 8. Backup/restore gate

Daily/PITR config không đủ để đóng gate. Tạo backup checkpoint, restore sang isolated project/local
target, giữ provider/cron disabled trước khi mở target, rồi kiểm tra:

- migration history và extension/function/RLS;
- row counts/checksum cho domain/audit/outbox;
- Vault decryptability theo đúng loại restore;
- không có Cron/Edge/provider side effect từ restore target.

Ghi target, backup timestamp, restore start/end, integrity result và cleanup owner vào
[`S4-EVIDENCE-TEMPLATE.md`](../qa/S4-EVIDENCE-TEMPLATE.md).
