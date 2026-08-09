# I’m Okay — Staging operations runbook

Runbook này triển khai và nghiệm thu S4. Chỉ dùng project, domain, sender, tài khoản và thiết bị dành
riêng cho staging. Không dùng dữ liệu cá nhân hoặc contact chưa consent.

## 1. Thông tin bắt buộc trước khi deploy

Ghi vào evidence, không commit secret:

- Supabase organization/project ref, region và plan staging đã được owner chấp thuận.
- HTTPS contact-web domain và hosting provider đã chọn.
- Auth site URL, `imokay://**` redirect và Google OAuth redirect staging.
- Resend verified staging sender; danh sách test recipients đã consent.
- Android/iOS test device và Expo project/build ID.
- Người phụ trách go/hold/rollback và incident contact.

CLI phải đăng nhập bằng `npx supabase login` của operator. Không dán token, database password, secret key,
Resend key hoặc internal secret vào issue/chat/log.

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
   RESEND_API_KEY=<staging key>
   RESEND_FROM=I’m Okay <alerts@<verified-domain>>
   ```

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
   `_headers`; SPA fallback phải giữ token route nhưng không log URL ở analytics.
6. Cấu hình mobile preview environment bằng publishable values; tuyệt đối không đưa secret key vào
   `EXPO_PUBLIC_*`.

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

## 5. Bật provider và accelerated acceptance

Chỉ đổi `NOTIFICATION_DELIVERY_ENABLED=true` khi test user/contact/device đã consent và preflight
xanh. Dùng một test account riêng; không sửa policy production. Để chạy nhanh, tạo cycle cho test
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

- Provider outage: đặt `NOTIFICATION_DELIVERY_ENABLED=false`, giữ queue, xác định unknown outcomes
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
