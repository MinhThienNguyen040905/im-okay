# I’m Okay — Mobile app implementation plan

## 1. Mục tiêu và phạm vi

Xây dựng app Expo + React Native + TypeScript cho iOS/Android, dành cho người được bảo vệ. App phải cho phép người dùng hiểu trạng thái an toàn trong vài giây, check-in đơn giản và quản lý kế hoạch/liên hệ mà không tự quyết định deadline.

Bao gồm 12 màn hình Stitch:

| ID  | Màn hình               | Nhóm       |
| --- | ---------------------- | ---------- |
| M01 | Giới thiệu             | Onboarding |
| M02 | Đăng nhập              | Auth       |
| M03 | Thiết lập hồ sơ        | Onboarding |
| M04 | Quyền thông báo        | Onboarding |
| M05 | Kế hoạch an toàn       | Onboarding |
| M06 | Trang chủ/check-in     | Core       |
| M07 | Liên hệ tin cậy        | Contacts   |
| M08 | Thêm liên hệ           | Contacts   |
| M09 | Cảnh báo sắp kích hoạt | Alert      |
| M10 | Trợ giúp khẩn cấp/SOS  | Alert      |
| M11 | Lịch sử                | Management |
| M12 | Cài đặt                | Management |

Ngoài phạm vi mobile: tính deadline authoritative, gửi email/push thật, escalation và public contact response. Các hành vi đó thuộc API/worker.

## 2. Nguồn thiết kế

Trước khi code một screen:

1. Đọc `design/stitch/DESIGN.md` và `04-UX-FLOWS.md`.
2. Tìm selected screen trong `05-SCREEN-TRACKER.md` và `.stitch/metadata.json`.
3. Lấy screenshot/HTML mới nhất bằng Stitch MCP khi local artifact bị đánh dấu pre-edit.
4. Dùng HTML để tham khảo hierarchy, không copy nguyên khối.
5. Chuyển design token thành typed theme; không rải hex, radius hoặc spacing trong screen.

Viewport tham chiếu là 390×844 px. Phải test thêm màn hình nhỏ, safe area, bàn phím và accessibility font scaling.

## 3. Kiến trúc client

```text
Expo Router routes
      |
Screen/container
      |
Feature hooks + TanStack Query
      |
Typed API client from OpenAPI/contracts
      |
NestJS API
```

Nguyên tắc:

- Server state dùng TanStack Query; không nhân bản vào global store.
- Local UI state ở gần component; chỉ thêm state library khi có nhu cầu xuyên route thật.
- Form dùng React Hook Form + Zod.
- API client nhận correlation/request ID và map error có kiểu.
- Session do Supabase Auth quản lý; API vẫn xác minh token/authorization.
- Countdown chỉ là hiển thị từ server time/deadline; client không trigger alert.
- Offline mutation không được hiển thị thành công trước khi server xác nhận.

Cấu trúc feature đề xuất:

```text
apps/mobile/src/
  app/                   Expo Router routes
  features/
    auth/
    onboarding/
    check-in/
    contacts/
    alerts/
    history/
    settings/
  components/
  theme/
  lib/api/
  lib/auth/
  lib/notifications/
  test/
```

## 4. Giai đoạn triển khai

### MA0 — Design readiness

- [x] Chốt navigation contract M01→M06, M06→M07/M09/M10/M11/M12. Đã kiểm chứng qua Stitch Web và tài liệu Controls chính thức rằng Stitch không hỗ trợ nối cross-screen prototype; contract này sẽ được hiện thực bằng Expo Router và kiểm thử E2E.
- [x] Chốt state check-in success/error/offline/loading.
- [x] Chốt push denied/disabled và auth expired.
- [x] Chốt SOS hold progress và accessible two-step alternative.
- [x] QA M01/M02…M12 với font scaling bằng Stitch accessibility consistency pass; runtime verification tiếp tục ở MA7.

Exit: tracker mobile sẵn sàng implementation; không còn luồng cốt lõi phải tự thiết kế trong lúc code.

Biên bản và mapping MA0: `design/stitch/06-MA0-DESIGN-READINESS.md`.

### MA1 — App foundation

- [x] Scaffold Expo/Expo Router và TypeScript strict.
- [x] Thêm typed environment config cho public client values.
- [x] Implement theme/tokens, typography, spacing, icon wrapper.
- [x] Implement Button, Input, Card, Badge, Screen, ErrorState, LoadingState.
- [x] Thiết lập root error boundary, Sentry và sanitized logging.
- [x] Tạo auth/onboarding/main route groups.
- [x] Tạo bottom tabs: Trang chủ, Lịch sử, Cài đặt.
- [x] Thiết lập unit/component test và preview fixture.

Exit: app chạy iOS/Android, navigation shell hoạt động, shared component có accessibility labels.

Hoàn tất ngày 02/08/2026 tại `apps/mobile` với Expo SDK 57. Bằng chứng kiểm chứng:

- `expo install --check`: dependency tương thích.
- TypeScript, ESLint và 7 test case trong 5 suite đều xanh.
- Expo Router integration test mở `/history` và xác nhận ba bottom tab.
- `expo export --platform android` và `expo export --platform ios` đều bundle thành công.
- Sentry mặc định tắt khi chưa có DSN; public env được validate và telemetry scrub token/PII.
- ADR: `docs/adr/0001-mobile-foundation.md`.

### MA2 — Auth và onboarding M01–M05

- [x] M01 giới thiệu và safety limitation.
- [x] M02 email/Google sign-in, loading, error và auth callback.
- [x] Session restore, sign-out và xử lý phiên hết hạn/token refresh failure.
- [x] M03 profile + timezone detection/confirmation.
- [x] M04 xin quyền push sau khi giải thích; link sang system settings khi disabled.
- [x] Đăng ký/cập nhật Expo device token qua API, giữ `pending` khi offline/chưa có project ID.
- [x] M05 chọn 24/36/48 giờ và tạo safety plan sau khi adapter xác nhận.
- [x] Persist onboarding progress theo user để resume sau khi app bị kill.

API phụ thuộc: `/me`, `/me/devices`, `/safety-plan`; xem Plan 03.

Exit: user mới đi hết onboarding và vào M06; push denied không chặn tài khoản nhưng giới hạn được nói rõ.

Client implementation hoàn tất ngày 02/08/2026. Local fixture flow đáp ứng exit UX và luôn
hiển thị cảnh báo chưa có bảo vệ thật. Remote acceptance vẫn mở cho đến khi BA2/BA3 có API,
Supabase email/Google được cấu hình, EAS project ID có mặt và push được kiểm tra trên thiết bị
thật/development build. ADR: `docs/adr/0002-mobile-auth-onboarding.md`.

Bằng chứng kiểm chứng client MA2:

- `expo install --check`: dependencies tương thích Expo SDK 57.
- `expo-doctor`: 20/20 checks passed.
- ESLint, TypeScript và 13 test case trong 6 suite đều xanh; routing test bao phủ resume M01–M06 và trường hợp push denied.
- `expo export --platform android` và `expo export --platform ios` đều bundle thành công.
- Chưa chạy remote auth/API/push E2E vì các dependency nêu trên chưa tồn tại trong repository.

### MA3 — Home và check-in M06

- [ ] Hiển thị authoritative status, last check-in, exact next deadline và relative countdown.
- [ ] Bộ đếm dùng server-time offset, tự resync khi app foreground.
- [ ] Check-in mutation gửi client idempotency key.
- [ ] Chặn duplicate taps trong khi request pending.
- [ ] Chỉ hiển thị success sheet sau response thành công.
- [ ] Timeout/offline cho phép retry cùng idempotency key khi phù hợp.
- [ ] Refresh state khi app resume hoặc push được mở.
- [ ] Entry points sang contacts, warning và SOS.

API phụ thuộc: `/safety-plan/status`, `/check-ins`; xem Plan 03/04.

Exit: app không thể reset deadline cục bộ; concurrent/duplicate interaction có UX xác định.

### MA4 — Trusted contacts M07/M08

- [ ] Danh sách tối đa ba contact và invitation status.
- [ ] Empty state và CTA thêm contact.
- [ ] Form tên/email, không hiển thị phone/SMS trong MVP.
- [ ] Inline validation, duplicate/max-limit errors từ server.
- [ ] Reorder priority, resend có cooldown, remove có strong confirmation.
- [ ] Refresh status sau khi contact accept W01.

API phụ thuộc: `/trusted-contacts`, `/contact-invitations`; xem Plan 03.

Exit: mobile không tự suy diễn `confirmed`; status luôn đến từ API.

### MA5 — Warning, SOS, snooze và drill M09/M10

- [ ] M09 hiển thị exact deadline, thời gian còn lại và alert consequence.
- [ ] Check-in từ M09 dùng cùng mutation/idempotency với M06.
- [ ] Snooze chọn duration hữu hạn, hiển thị `ends_at`, confirm từ server.
- [ ] M10 giữ ba giây, progress feedback, cancel gesture và haptic phù hợp.
- [ ] Cung cấp accessible two-step SOS khi hold không thực hiện được.
- [ ] Không hứa hẹn gọi cấp cứu/vị trí.
- [ ] Drill dùng badge/copy riêng và confirmation trước khi gửi.
- [ ] Correction state khi user check-in sau alert.

API phụ thuộc: `/safety-plan/snooze`, `/alerts/sos`, `/alerts/drill`, `/alerts/current`.

Exit: tap nhanh không gửi SOS; snooze không có tùy chọn vô thời hạn; drill không bị nhầm là alert thật.

### MA6 — History và settings M11/M12

- [ ] History pagination, pull-to-refresh, empty/error state.
- [ ] Nhóm check-in, warning, alert, response, correction và drill bằng wording rõ.
- [ ] Không hiển thị provider error/token/PII nhạy cảm.
- [ ] Settings cho profile, timezone, interval và push status.
- [ ] Entry point quản lý contacts.
- [ ] Disable safety plan có strong confirmation và server result.
- [ ] Account export/delete request theo policy.

Exit: thay đổi interval/timezone tạo lịch mới trên backend; app không tự sửa deadline.

### MA7 — Hardening và release

- [ ] Dynamic font, VoiceOver/TalkBack, focus order và reduced motion.
- [ ] Device matrix Android/iOS, light/dark behavior theo spec.
- [ ] Deep/universal links an toàn; app không nhận public token không cần thiết.
- [ ] Sentry release/source maps và PII scrub.
- [ ] E2E onboarding/check-in/offline/SOS guard.
- [ ] Build profile local/staging/production và store signing trong secret manager.
- [ ] TestFlight/Google Play Internal Testing, staged rollout và rollback plan.

## 5. Trạng thái và error contract cần hỗ trợ

- `UNAUTHENTICATED`, `SESSION_EXPIRED`, `ACCOUNT_DISABLED`.
- `SAFETY_PLAN_INACTIVE`, `SAFETY_PLAN_SNOOZED`.
- `CHECK_IN_ALREADY_APPLIED`, `CHECK_IN_CONFLICT`, `ALERT_ALREADY_TRIGGERED`.
- `CONTACT_LIMIT_REACHED`, `CONTACT_DUPLICATE`, `INVITATION_COOLDOWN`.
- `NETWORK_OFFLINE`, `REQUEST_TIMEOUT`, generic retryable/non-retryable error.

Client map code sang copy bình tĩnh, không hiển thị stack/provider error.

## 6. Kiểm thử

Unit/component:

- Form validation và error mapping.
- Countdown format/server offset.
- Check-in button pending/duplicate behavior.
- SOS hold/cancel/two-step alternative.
- Contact status và max-limit states.

Integration:

- Auth restore + API client refresh.
- Query invalidation sau check-in/contact/settings mutation.
- Push token registration/disable.
- App foreground refresh quanh deadline.

E2E:

- M01→M06.
- Check-in success/offline/timeout/retry.
- M07→M08 và invitation status refresh.
- M09 check-in/snooze.
- SOS accidental tap và confirmed send.
- History/settings critical actions.

## 7. Definition of Done

- Screen khớp selected Stitch direction và dùng typed tokens.
- Không hard-code business deadline hoặc provider behavior trong client.
- Loading/empty/error/offline/disabled state đủ.
- Touch target 48×48, screen-reader label, focus và font scaling được test.
- Unit/component/E2E liên quan xanh trên iOS và Android target.
- Sentry/log không chứa token, authorization header hoặc PII không cần thiết.
- API contract/roadmap/tracker được cập nhật nếu hành vi thay đổi.

## 8. Bước tiếp theo

1. Triển khai BA1–BA3 và nghiệm thu MA2 ở `remote` với `/me`, `/me/devices`, `/safety-plan`.
2. Cấu hình Supabase redirect `imokay://**`, Google provider, EAS project ID và kiểm tra push trên thiết bị thật/development build.
3. Bắt đầu MA3 khi API authoritative status/check-in sẵn sàng; không hard-code deadline ở client.
4. Hoàn tất DI1 cho ba app còn lại, shared config và CI; workspace hiện chỉ có phần tối thiểu để chạy mobile.
