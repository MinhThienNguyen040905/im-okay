# I’m Okay — trạng thái dự án

Đây là **nguồn duy nhất cho tiến độ hiện tại**. Cập nhật file này khi có build, deploy, test evidence,
blocker hoặc thay đổi thứ tự ưu tiên. Không tạo thêm plan/roadmap tiến độ song song.

Mốc cập nhật: **22/08/2026**.

## Kết luận hiện tại

Dự án đã đủ để chạy **Android personal pilot với một nhóm nhỏ có đồng thuận** trên Supabase staging.
Mobile và backend cốt lõi hoạt động; contact web đã deploy. Dự án chưa phải bản phát hành rộng trên
Google Play/App Store và chưa vượt toàn bộ gate của internal release.

## Tiến độ theo hệ thống

| Hệ thống               | Trạng thái                            | Evidence chính                                                                                                                               |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Thiết kế               | Hoàn thành baseline                   | 12 màn mobile + 5 màn web trong Stitch; M02 đăng nhập được redesign ngày 18/08; metadata ở `.stitch/metadata.json`                           |
| Mobile M01–M12         | Hoàn thành chức năng MVP              | Expo SDK 57, remote adapters, accessibility hardening, i18n Việt/Anh toàn bộ giao diện, 142 test trong 42 suite                              |
| Android personal pilot | Sẵn sàng dùng thử có giám sát         | APK staging build `6cc536f6-faf2-4971-ae88-88235a958447`, commit `d9abb19`, cài thành công và cold-start pass trên TECNO KJ7 ngày 22/08/2026 |
| iOS                    | Source build được; phân phối chưa làm | Chưa có signed device build/TestFlight acceptance                                                                                            |
| Supabase backend       | Đã chạy trên cloud staging            | 8 migrations, Auth/PostgreSQL/RLS/RPC, 5 Edge Function deployables, Cron/Queues/outbox                                                       |
| Contact web            | Đã deploy staging                     | `https://im-okay-contact-staging.vercel.app`                                                                                                 |
| Push/email E2E         | Đã chứng minh cho personal pilot      | Expo receipt và Gmail invitation/alert/correction đã pass trong supervised cycle                                                             |
| Security baseline      | Đạt mức staging                       | JWT/actor/IDOR/RLS/public-token/rate-limit negative matrix đã pass                                                                           |
| Store/internal release | Chưa hoàn thành                       | Chưa có Google Play Internal Testing hoặc TestFlight                                                                                         |

## Trạng thái dữ liệu staging

Supabase project `xnaanctveihyksgcveup` đã được reset theo yêu cầu owner lúc **20:52 ngày
13/08/2026 (UTC+7)**:

- không chạy local seed;
- Auth users, profile, device, safety plan, contact, invitation, check-in, alert, delivery, audit,
  outbox, account request và queue đều bằng `0`;
- 8/8 migrations đã được áp dụng lại;
- 4/4 Cron jobs active, public Edge health trả `200`, private API không xác thực trả `401`;
- `NOTIFICATION_DELIVERY_ENABLED=true` đã được bật lại sau khi xác minh database sạch;
- không gửi notification trong quá trình reset/readiness check.

Đây là snapshot tại thời điểm reset. Sau khi owner đăng ký lại, các số lượng sẽ tăng bình thường.

## Trạng thái đa ngôn ngữ

- Mobile đã có i18n foundation cho `vi`/`en`: tự nhận locale thiết bị, lưu lựa chọn
  bằng AsyncStorage, language switcher và resource typed.
- Resource Việt/Anh hiện bao phủ Auth, onboarding, navigation, Home, History, Contacts,
  Alert/SOS, Settings, trạng thái tải/lỗi, validation và các hộp xác nhận. Đổi lựa chọn trong
  Settings áp dụng ngay cho màn hình đang mở, copy nghiệp vụ, nhãn trợ năng và định dạng thời gian.
- Có regression test cho đổi locale trong formatter check-in, lịch sử, alert và trusted contacts;
  mobile typecheck và 142 test trong 42 suite pass.
- APK staging hiện hành từ commit `d9abb19` đã chứa lần hoàn thiện i18n và đã được cài trên
  TECNO KJ7 ngày 22/08/2026. Cần xác nhận thủ công đổi ngôn ngữ trong luồng sử dụng thực tế;
  chưa suy diễn điều đó chỉ từ cold-start smoke.
- M02 đã bỏ native header trùng lặp, đổi language switcher thành chip 48×48, dùng logo Google đa màu
  chính thức và bố cục đăng nhập một cột không card. Lint, typecheck, 142 test, Expo export Android/iOS/web
  và visual smoke trên TECNO KJ7 đều pass.
- Google OAuth staging đã được cấu hình trực tiếp ngày 20/08: Google Auth Platform ở chế độ `Testing`,
  có một test user đã đồng thuận, OAuth Web client dùng callback Supabase chuẩn và provider Supabase đã bật.
  Kiểm tra read-only trả `external.google=true`; request `/auth/v1/authorize?provider=google` trả `302`
  tới Google. Credential chỉ nằm trong Google Cloud và Supabase Dashboard, không ở repository.

## Build Android hiện hành

- EAS build ID: `6cc536f6-faf2-4971-ae88-88235a958447`.
- Git commit: `d9abb1960d6398f22bd389aa23eaf15a96286949`.
- Profile: `staging`, distribution `internal`, package `com.imokay.app`.
- App version: `0.1.0`, Android version code `1`.
- APK SHA-256: `6462E26920D2C0372158C3352DD43D63D8DD784497199117091CE1665F8FF7D8`.
- Kết quả device smoke ngày 22/08/2026 trên TECNO KJ7/Android 14: `adb install -r` thành công,
  `com.imokay.app/MainActivity` ở foreground sau cold-start và log gần nhất không có
  `FATAL EXCEPTION`, `AndroidRuntime` hay React Native error. Artifact được build với staging/remote,
  package `com.imokay.app`, version `0.1.0` và Android version code `1`.
- Artifact EAS có thời hạn; nếu link hết hạn phải tạo build mới từ exact commit.

## Những gì đã hoạt động

- Đăng nhập email và onboarding hồ sơ, timezone, push permission, safety plan. Google OAuth staging đã bật;
  hiện chỉ cho các test user Google đã được thêm vào consent screen trong giai đoạn `Testing`.
- Check-in 24/36/48 giờ với deadline do server quản lý.
- Trusted contact tối đa ba người, invitation qua public web và acceptance.
- Reminder, overdue alert, escalation, acknowledgement/resolve/cannot-help và correction.
- Snooze hữu hạn, guarded SOS, drill, history và settings.
- Outbox/PGMQ, retry, stale-job protection, reconciliation, audit và delivery log.
- Contact web responsive cho W01–W05.
- Provider kill switch, staging preflight, aggregate ops snapshot và security smoke tooling.

## Giới hạn và blocker còn mở

Các mục sau không chặn Android personal pilot nhỏ nhưng chặn phát hành rộng/internal release hoàn chỉnh:

1. Chưa build/test iOS device và chưa phân phối TestFlight.
2. Chưa đưa Android lên Google Play Internal Testing.
3. Sentry source-map/symbolication và release monitoring chưa được nghiệm thu trên staging.
4. Hosted backup/PITR restore sang môi trường biệt lập chưa có evidence hoàn chỉnh.
5. Full accessibility/device matrix và hosted fault drill chưa hoàn tất.
6. Privacy Policy, Terms, support/privacy contact và ownership vẫn còn mục `OWNER REQUIRED`.
7. Gmail SMTP chỉ phù hợp personal pilot; cần verified-domain email provider trước beta rộng/production.
8. Workflow export/deletion mới ghi nhận request; chưa có worker/SLA hoàn tất tự động.
9. Google OAuth staging đang ở `Testing` với một test user; cần hoàn tất smoke đăng nhập Google trên Android
   trước khi nghiệm thu luồng và chỉ thêm tester đã đồng thuận. Không publish consent screen hoặc mở rộng
   ngoài personal pilot khi chưa xử lý các gate privacy/support còn lại.

## Trạng thái notification

Code và secret staging hỗ trợ Expo Push + Gmail SMTP, và E2E thật đã từng pass. Delivery đang bật lại
sau reset ngày 13/08/2026. Tuy nhiên `NOTIFICATION_DELIVERY_ENABLED` là kill switch vận hành có thể được
bật/tắt độc lập với build.

Trước mỗi thử nghiệm gửi thật:

- chỉ dùng tài khoản, thiết bị và contact đã đồng thuận;
- chạy `pnpm staging:preflight` và `pnpm staging:provider-readiness`;
- xác nhận kill switch và provider bằng ops tooling;
- tắt lại delivery sau supervised smoke nếu không chủ đích vận hành liên tục;
- không suy ra delivery đang bật chỉ từ tài liệu hoặc việc backend trả health `200`.

## Việc tiếp theo theo thứ tự

### Ngắn hạn — dùng thử Android

- Phân phối APK staging cho nhóm nhỏ, ghi device/OS và feedback UI/flow.
- Chạy một chu kỳ thực có giám sát cho mỗi tester/contact đã đồng thuận.
- Theo dõi Cron, queue, delivery và duplicate/missing alert trong thời gian pilot.
- Sửa lỗi blocker; không mở rộng tester nếu có false success, missing hoặc duplicate alert.

### Internal release

- Chốt owner/support/privacy/incident contact.
- Nghiệm thu Sentry và release metadata.
- Hoàn thành hosted backup/restore và fault drill.
- Tạo Google Play Internal Testing và iOS TestFlight build.
- Hoàn thành accessibility/device matrix cho thiết bị mục tiêu.

### Beta/production

- Chuyển khỏi Gmail SMTP sang provider có verified domain.
- Hoàn thiện legal/store listing, data safety/privacy labels và account deletion fulfillment.
- Đo SLO thực tế rồi mới quyết định rollout percentage và alert thresholds.

## Lệnh kiểm tra

Repository-wide:

```powershell
pnpm check
pnpm test:integration
```

Mobile:

```powershell
npm --prefix apps/mobile run lint
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
npm --prefix apps/mobile run build
```

Staging read-only/preflight:

```powershell
pnpm staging:preflight
pnpm staging:provider-readiness
pnpm staging:security-smoke
pnpm staging:observability
```

Các lệnh staging có thể cần env/secret của operator. Không chép secret vào tài liệu hoặc output bàn giao.

## Tài liệu liên quan

- Tổng quan và setup: `README.md`.
- Hướng dẫn session mới: `AGENTS.md`.
- Thiết kế: `design/stitch/README.md` và `design/stitch/DESIGN.md`.
- Quyết định kiến trúc: `docs/adr/`.
- Build/vận hành/release: `docs/release/`.
- Evidence và device matrix: `docs/qa/`.
