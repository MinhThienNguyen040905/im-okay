# I’m Okay — Mobile app status and remaining gates

## 1. Vai trò của plan

Plan này chỉ theo dõi mobile Expo cho người được bảo vệ. Toàn bộ client M01–M12
đã được triển khai; MA2–MA3 đã nối Supabase local/integration trong S2 và MA4–MA6 đã nối contract
S3 local/integration. Công việc còn lại là kiểm thử trên staging/thiết bị và phát hành internal build.

Chi tiết quyết định và bằng chứng đã hoàn thành nằm trong ADR 0001–0007. Bản
plan cũ có 57 checkbox hoàn thành được rút gọn tại đây; việc rút gọn không
thay đổi trạng thái hay nghiệm thu đã ghi nhận.

Ngoài phạm vi mobile: authoritative deadline/state transition, email/push thật,
escalation, public contact response và account-data processing. Các phần này thuộc
[`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md).

## 2. Trạng thái M01–M12

| Hạng mục                             | Trạng thái client | Nghiệm thu còn lại                                | Bằng chứng                                                  |
| ------------------------------------ | ----------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| MA0 design/navigation                | Hoàn tất          | Không                                             | `design/stitch/06-MA0-DESIGN-READINESS.md`                  |
| MA1 foundation                       | Hoàn tất          | Không                                             | `docs/adr/0001-mobile-foundation.md`                        |
| MA2 auth/onboarding M01–M05          | Hoàn tất          | Google/redirect và push token trên staging/device | `docs/adr/0002-mobile-auth-onboarding.md`                   |
| MA3 check-in M06                     | Hoàn tất          | Remote device/staging acceptance                  | `docs/adr/0003-mobile-authoritative-check-in.md`            |
| MA4 trusted contacts M07/M08         | Hoàn tất          | Email thật và invitation flow trên staging        | `docs/adr/0004-mobile-authoritative-trusted-contacts.md`    |
| MA5 warning/SOS/snooze/drill M09/M10 | Hoàn tất          | Alert/provider E2E trên staging                   | `docs/adr/0005-mobile-authoritative-alert-actions.md`       |
| MA6 history/settings M11/M12         | Hoàn tất          | Retention/re-auth acceptance trên staging         | `docs/adr/0006-mobile-history-settings-safe-projections.md` |
| MA7 repository hardening             | Hoàn tất          | Device/accessibility/build/store gate             | `docs/adr/0007-mobile-release-hardening.md`                 |

## 3. Contract client phải giữ

- Supabase Auth sở hữu session; mobile không nhận service-role key.
- Server state dùng TanStack Query; mutation deadline/plan/alert không optimistic.
- Remote mode không tính deadline. Countdown chỉ dùng `serverTime` và authoritative
  `nextDeadlineAt`.
- Check-in, snooze, SOS, drill, disable/export/delete dùng persisted `Idempotency-Key` theo
  scope; retry outcome không chắc chắn phải dùng lại key.
- Trusted-contact status và alert/correction state chỉ đến từ backend projection.
- Offline/timeout không được hiển thị check-in/SOS thành công giả.
- SOS cần hold ba giây hoặc accessible two-step; drill có source/copy riêng.
- Public invitation/alert token thuộc contact web, không đi vào mobile route.
- `EXPO_PUBLIC_DATA_MODE=fixture` chỉ dùng local và luôn hiển thị chưa có bảo vệ thật.

HTTP route, projection, error code và idempotency contract hiện có được giữ khi nối
Supabase Edge Function router. Nếu backend contract cần thay đổi, cập nhật adapter,
Zod schema, test và ADR trong cùng thay đổi.

## 4. Gate còn mở

### Remote integration

- [x] Xác minh email magic-link, redirect và session restore với Supabase staging trên Android.
- [ ] Xác minh Google auth với Supabase staging trên thiết bị thật.
- [x] Xác minh profile/device/safety-plan onboarding qua Edge Functions trên local/integration.
- [x] Chạy check-in duplicate/concurrent/offline/timeout với PostgreSQL và scheduler local thật.
- [x] Chạy invitation accept/decline/revoke/concurrent-submit qua contact web local/integration.
- [ ] Chạy accelerated warning/alert/escalation/correction/SOS/drill E2E.
- [x] Xác minh history/settings/disable/export/delete projection và recent-auth ở local/integration.
- [ ] Xác minh Expo push token lifecycle và receipt trên thiết bị thật.

### Device and release acceptance

- [ ] Chạy VoiceOver/TalkBack, external-keyboard focus và font 200% theo device matrix.
- [x] Tạo Android internal build đã ký và ghi build ID/thiết bị/kết quả.
- [ ] Tạo iOS internal build đã ký và ghi build ID/thiết bị/kết quả.
- [ ] Xác minh Sentry source-map upload/symbolication và PII scrub trên staging build.
- [ ] Chạy Maestro smoke trên internal binary; fixture smoke không thay remote E2E.
- [ ] Nghiệm thu TestFlight/Google Play Internal Testing trước khi mở beta.

## 5. Baseline đã kiểm chứng

Tại lần kiểm tra S3 ngày 04/08/2026:

- ESLint và TypeScript xanh.
- 109 test case trong 34 suite xanh.
- `expo install --check` xanh; `expo-doctor` 20/20 là evidence MA7 gần nhất và chưa chạy lại ở S2.
- `expo export --platform all` thành công cho Android, iOS và web.
- Remote adapter + local Edge smoke đã chứng minh onboarding/check-in, trusted contacts, public
  invitation/alert response, SOS, history/settings và account request contract; staging/device/provider
  acceptance vẫn mở.
- EAS profiles, Maestro fixture smoke, device matrix và release/rollback runbook đã có.
- Staging profile đã chứa Supabase/API URL public; Supabase Auth allowlist có `imokay://**`.
  EAS project `@minh004/im-okay` đã liên kết với project ID
  `3ea9c673-0f86-4d5e-a802-53899da19dcb`. Signed Android internal APK build
  `be78049b-0f7e-4bee-a7f4-c18637d00b65` đã cài/chạy trên TECNO KJ7, Android 14/API 34;
  onboarding → login smoke xanh và không có FATAL. iOS/internal-store gate vẫn mở.
- Trên cùng thiết bị, màn hình login ở font scale `2.0` vẫn cuộn được, giữ đủ email/button;
  external-keyboard focus đi Google → phân cách → email → submit và không có FATAL. Font hệ thống
  đã restore `1.0`; TalkBack/full-journey matrix vẫn mở.
- Supabase email magic-link mới tới test account đã consent mở lại đúng app; callback tạo authenticated
  session và session vẫn được khôi phục sau force-stop/mở lại trên TECNO KJ7.
- Device test phát hiện callback của magic link hết hạn có tham số Supabase `sb` và bị incoming-link
  guard phân loại nhầm. Guard đã cho phép đúng callback parameter này, regression test pass; EAS
  snapshot build `34309c7e-92f1-4842-9001-5e37d020eb99` đã cài đè trên thiết bị; callback bằng link
  mới và session restore đã pass. Đây chưa phải RC exact-commit.
- Quota Auth mặc định đã reset và lần gửi kế tiếp thành công. Client đã map rate-limit, expired-link,
  network và unknown auth error sang copy tiếng Việt không lộ chi tiết provider; source fix copy này
  đã có trong EAS staging snapshot `ecb41bd6-1c40-4c54-84ab-ed0f015b80ea` cài trên thiết bị.
- Authenticated staging smoke đã cập nhật profile timezone từ `UTC` sang `Asia/Ho_Chi_Minh`, hiển thị
  deadline đúng local time, check-in thật thành công và History có bản ghi mới. Google auth, fresh-user
  onboarding, push receipt và full remote journey vẫn mở.
- Home không còn trình bày alert nội bộ `scheduled` như cảnh báo cần chú ý; copy check-in trước khi có
  notification cũng không còn ngụ ý cảnh báo đã phát. Regression test, 128 mobile test, relaunch/session
  restore và UI dump trên TECNO KJ7 đều pass; snapshot trên vẫn chưa phải RC exact-commit.
- Provider smoke trên TECNO KJ7 phát hiện Android đã cấp quyền notification nhưng app không có đường
  retry đăng ký Expo token sau onboarding; database vẫn có `0` device. Settings đã gọi lại
  `requestPush` và chỉ báo sẵn sàng sau server projection `registered`. EAS staging snapshot
  `2a6cb1be-85c0-48d1-bc75-f0f97ff10842` đã `FINISHED`, APK SHA-256
  `E52AA620AFE2AB239EF81ED3442B3E368101D4752BEE416C78235554173F731C` đã cài đè; session
  được giữ và logcat không có FATAL/React error. Thử lại vẫn không tạo device vì Android build
  chưa có `google-services.json` và FCM V1 credential cho EAS.
- Lỗi đăng ký push trước đó bị ghi vào state không được render. Source hiện đã hiển thị feedback
  an toàn bằng assertive live region. Dynamic Expo config cũng đã sẵn sàng đọc
  `android.googleServicesFile` từ EAS file variable `GOOGLE_SERVICES_JSON`, không commit file/key.
  Root quality gate xanh với 131 mobile test/37 suite. Các fix này chưa nằm trong APK trên và
  cần build lại sau khi nạp FCM config/credential.

Phải chạy lại các check thực tế sau mỗi thay đổi. Baseline cũ không chứng minh
build hiện tại hoặc remote backend đang hoạt động.

## 6. Definition of Done

Mobile sẵn sàng internal release khi:

- Tất cả remote-integration gate ở trên xanh trên staging gần production.
- Loading/empty/error/offline/disabled state không hiển thị thành công giả.
- Touch target, screen reader, focus, reduced motion và font scaling đạt device matrix.
- Sentry/log không chứa token, authorization header hoặc PII không cần thiết.
- Internal build đã ký và store testing được ghi nhận theo
  [`03-RELEASE.md`](03-RELEASE.md).

## 7. Bước tiếp theo

Không làm lại M01–M12. S1–S3 trong [`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md), EAS project,
Android signed build, email callback/session restore và check-in/history staging smoke đã hoàn tất.
Tiếp theo cấu hình Android FCM transport cho Expo Push, build lại staging và xác minh
token/ticket/receipt. Sau đó chạy Google/fresh-user onboarding, provider E2E, accessibility matrix,
Sentry symbolication và iOS/store gates.
Chỉ đóng gate bằng evidence thật.
