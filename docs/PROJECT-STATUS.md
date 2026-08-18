# I’m Okay — trạng thái dự án

Đây là **nguồn duy nhất cho tiến độ hiện tại**. Cập nhật file này khi có build, deploy, test evidence,
blocker hoặc thay đổi thứ tự ưu tiên. Không tạo thêm plan/roadmap tiến độ song song.

Mốc cập nhật: **18/08/2026**.

## Kết luận hiện tại

Dự án đã đủ để chạy **Android personal pilot với một nhóm nhỏ có đồng thuận** trên Supabase staging.
Mobile và backend cốt lõi hoạt động; contact web đã deploy. Dự án chưa phải bản phát hành rộng trên
Google Play/App Store và chưa vượt toàn bộ gate của internal release.

## Tiến độ theo hệ thống

| Hệ thống               | Trạng thái                            | Evidence chính                                                                                                                                     |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thiết kế               | Hoàn thành baseline                   | 12 màn mobile + 5 màn web trong Stitch; M02 đăng nhập được redesign ngày 18/08; metadata ở `.stitch/metadata.json`                                 |
| Mobile M01–M12         | Hoàn thành chức năng MVP              | Expo SDK 57, remote adapters, accessibility hardening, 137 test trong 41 suite                                                                     |
| Android personal pilot | Sẵn sàng dùng thử có giám sát         | APK staging build `1e2fd945-2d1c-4220-8123-696f1bf7962a`, commit `b12aa76`, cài nâng cấp và visual smoke thành công trên TECNO KJ7 ngày 18/08/2026 |
| iOS                    | Source build được; phân phối chưa làm | Chưa có signed device build/TestFlight acceptance                                                                                                  |
| Supabase backend       | Đã chạy trên cloud staging            | 8 migrations, Auth/PostgreSQL/RLS/RPC, 5 Edge Function deployables, Cron/Queues/outbox                                                             |
| Contact web            | Đã deploy staging                     | `https://im-okay-contact-staging.vercel.app`                                                                                                       |
| Push/email E2E         | Đã chứng minh cho personal pilot      | Expo receipt và Gmail invitation/alert/correction đã pass trong supervised cycle                                                                   |
| Security baseline      | Đạt mức staging                       | JWT/actor/IDOR/RLS/public-token/rate-limit negative matrix đã pass                                                                                 |
| Store/internal release | Chưa hoàn thành                       | Chưa có Google Play Internal Testing hoặc TestFlight                                                                                               |

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

## Trạng thái đa ngôn ngữ trong APK hiện hành

- Mobile đã có i18n foundation cho `vi`/`en`: tự nhận locale thiết bị, lưu lựa chọn
  bằng AsyncStorage, language switcher và resource typed.
- Auth, onboarding, navigation, error/loading/progress state và bộ chọn ngôn ngữ trong Settings
  đã dùng resource Việt/Anh; 137 test trong 41 suite, lint và typecheck pass.
- Home, History, Contacts, Alert/SOS và các copy nghiệp vụ còn lại chưa migrate hết.
  Tiếng Việt vẫn là fallback an toàn; không đánh dấu hỗ trợ tiếng Anh hoàn chỉnh.
- Foundation và các màn đã migrate ở trên, bao gồm M02 redesign ngày 18/08, có trong APK staging
  hiện hành từ commit `b12aa76`; phạm vi tiếng Anh vẫn là Phase 1, chưa phải bản dịch đầy đủ toàn app.
- M02 đã bỏ native header trùng lặp, đổi language switcher thành chip 48×48, dùng logo Google đa màu
  chính thức và bố cục đăng nhập một cột không card. Lint, typecheck, 137 test, Expo export Android/iOS/web
  và visual smoke trên TECNO KJ7 đều pass.

## Build Android hiện hành

- EAS build ID: `1e2fd945-2d1c-4220-8123-696f1bf7962a`.
- Git commit: `b12aa766741565b5c930db921bc515e9793bf292`.
- Profile: `staging`, distribution `internal`, package `com.imokay.app`.
- App version: `0.1.0`, Android version code `1`.
- APK SHA-256: `C2A1902EF84644995E3AE3FB9CD6A36C6137F1520371FD53666E8D0D2851CA42`.
- Kết quả device smoke ngày 18/08/2026 trên TECNO KJ7/Android 14: package `com.imokay.app` và
  SHA-256 certificate khớp bản cũ, `adb install -r` thành công, cold-start `MainActivity` thành công
  trong 545 ms, log khởi động không có FATAL/AndroidRuntime/React Native error. Xác nhận trực quan M02:
  header cũ đã ẩn, chip ngôn ngữ gọn và logo Google đa màu hiển thị đúng.
- Artifact EAS có thời hạn; nếu link hết hạn phải tạo build mới từ exact commit.

## Những gì đã hoạt động

- Auth Google/email và onboarding hồ sơ, timezone, push permission, safety plan.
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
