# ADR 0007 — Mobile release hardening và external acceptance boundary

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, MA7

> Cập nhật 2026-08-04: external backend/staging gate nay dùng kiến trúc Supabase-first theo
> ADR 0008. Repository hardening và các checkbox external acceptance của MA7 không đổi.

## Bối cảnh

MA0–MA6 đã hoàn tất client feature nhưng chưa đủ để gọi là bản release candidate. App còn cần
runtime accessibility, incoming-link boundary, release telemetry, build profiles và E2E harness.
Repository chưa có backend/staging, EAS project ID, store account, signing credential, Sentry
project hay thiết bị thật. Vì vậy phải phân biệt phần có thể chứng minh bằng source/automation với
external acceptance; không đánh dấu TestFlight/Google Play hoặc VoiceOver/TalkBack là đạt khi chưa
chạy thật.

## Quyết định

- Selected design hiện chỉ định palette light. Native app khóa `userInterfaceStyle=light` và
  status bar dùng dark content trên nền off-white. Navigation bar Android được giữ theo
  schema/default SDK và phải xác minh contrast trong device matrix. Dark system setting vẫn hiển
  thị light theme nhất quán; dark theme riêng cần design/contrast QA và ADR sau, không tự đảo màu.
- Root `AccessibilityProvider` theo dõi Reduce Motion và screen-reader state. Stack/modal loại bỏ
  transition khi Reduce Motion bật; SOS vẫn giữ progress bắt buộc nhưng giảm tần suất cập nhật và
  bỏ press-scale. Haptic không phải tín hiệu duy nhất.
- Modal có max height + ScrollView để chịu dynamic font, focus heading khi mở và announcement.
  Check-in/SOS/drill state quan trọng có role/live region; các nút và row không khóa một dòng gây
  clip text.
- Mobile chỉ nhận root launch và Supabase auth callback qua custom scheme. `+native-intent` cùng
  runtime guard từ chối route khác, unknown query và link/token dành cho contact web. Auth callback
  allowlist đúng PKCE/legacy session fields nhưng không log URL. Không cấu hình universal/app links
  trước khi có domain + AASA/assetlinks được kiểm chứng.
- Sentry giữ `sendDefaultPii=false`; before-send xóa toàn bộ user/request/server name và scrub
  message, exception, transaction, fingerprint, breadcrumb, context, extra và tag. Metro/config
  plugin hiện có chịu trách nhiệm source map; EAS chỉ upload khi `SENTRY_AUTH_TOKEN` cùng org/project
  được đặt trong environment/secret manager, không commit vào repo.
- `eas.json` có `local`, `staging`, `production`. Chỉ local được dùng fixture. Staging/production
  bắt buộc remote env; production là store distribution và auto-increment. Signing do EAS/Apple/
  Google credential store quản lý, không lưu `.jks`, `.p8`, `.p12`, key hay password trong Git.
- Maestro smoke chạy trên standalone/internal binary, bao phủ fresh onboarding, denied push,
  fixture check-in và restart restore. Offline/SOS full E2E không được giả lập bằng backdoor:
  chúng chờ staging API, fault injection và contact đã accept qua W01. Jest vẫn giữ negative tests
  cho offline/timeout/idempotency và SOS accidental tap/continuous hold.
- TestFlight/Google Play Internal Testing, device matrix và staged rollout là external acceptance.
  Việc chuẩn bị config/runbook không đồng nghĩa đã upload, ký hay rollout.

## Hệ quả

- Repository có release-safe defaults và executable smoke harness mà không cần secret thật.
- MA7 repository hardening có thể hoàn tất độc lập, nhưng MA7 external gate vẫn mở cho tới khi có
  backend/staging, EAS/Sentry/store setup và biên bản device/accessibility/internal-testing thật.
- Public invitation/alert links tiếp tục thuộc contact web. Nếu sản phẩm muốn app nhận loại link
  mới, phải threat-model scope/token, thêm route allowlist và test trước khi phát hành.
