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

- [x] Hiển thị authoritative status, last check-in, exact next deadline và relative countdown.
- [x] Bộ đếm dùng server-time offset, tự resync khi app foreground.
- [x] Check-in mutation gửi client idempotency key sinh bằng secure random.
- [x] Chặn duplicate taps trong khi request pending.
- [x] Chỉ hiển thị success sheet sau response thành công và qua schema.
- [x] Timeout/offline cho phép retry cùng idempotency key trong cửa sổ kỹ thuật phù hợp.
- [x] Refresh state khi app resume hoặc push được mở.
- [x] Entry points sang contacts, warning và SOS; route đích chưa mutation trước MA4/MA5.

API phụ thuộc: `/safety-plan/status`, `/check-ins`; xem Plan 03/04.

Exit: app không thể reset deadline cục bộ; concurrent/duplicate interaction có UX xác định.

Client implementation hoàn tất ngày 02/08/2026. Remote adapter không chứa phép tính deadline;
fixture calculation được cô lập và luôn có cảnh báo không bảo vệ thật. Remote acceptance vẫn
mở tới khi BA5 và scheduling/reconciliation backend hoạt động. ADR:
`docs/adr/0003-mobile-authoritative-check-in.md`.

Bằng chứng kiểm chứng client MA3:

- Contract test từ chối status thiếu `serverTime`; clock test bao phủ offset/countdown/approaching.
- Fixture test xác nhận duplicate idempotency key replay cùng last check-in/deadline.
- Remote adapter test xác nhận header `Idempotency-Key` và offline được phân loại retryable.
- Component test xác nhận CTA bị khóa khi request pending.
- `expo install --check` và `expo-doctor` 20/20 đều đạt.
- ESLint, TypeScript và 26 test case trong 12 suite đều xanh.
- `expo export --platform all` bundle thành công cho Android, iOS và web.
- Chưa chạy remote check-in E2E/concurrency vì BA5, database và worker chưa có trong repository.

### MA4 — Trusted contacts M07/M08

- [x] Danh sách tối đa ba contact và invitation status.
- [x] Empty state và CTA thêm contact.
- [x] Form tên/email, không hiển thị phone/SMS trong MVP.
- [x] Inline validation, duplicate/max-limit errors từ server.
- [x] Reorder priority, resend có cooldown, remove có strong confirmation.
- [x] Refresh status sau khi contact accept W01.

API phụ thuộc: `/trusted-contacts`, `/contact-invitations`; xem Plan 03.

Exit: mobile không tự suy diễn `confirmed`; status luôn đến từ API.

Client implementation hoàn tất ngày 02/08/2026. Mọi mutation chỉ commit full projection sau
server response; `accepted` không có local transition. Form gửi tên/email và explicit consent,
contact mới xếp cuối rồi được reorder bằng `orderedContactIds`. Cooldown dùng
`resendAvailableAt`/server-clock; remove có destructive confirmation. M07 refetch khi focus,
foreground hoặc mở push. ADR: `docs/adr/0004-mobile-authoritative-trusted-contacts.md`.

Bằng chứng kiểm chứng client MA4:

- Zod từ chối quá ba contact, duplicate id/email/priority và invitation status ngoài enum.
- Remote adapter test xác nhận request add không có phone/SMS, reorder gửi full order và error
  duplicate/cooldown được map bằng code.
- Fixture test bao phủ normalized duplicate, max-limit, reorder, remove compact priority và
  resend cooldown; fixture không có action tự tạo `accepted`.
- ESLint, TypeScript và 39 test case trong 16 suite đều xanh.
- `expo export --platform all` bundle thành công cho Android, iOS và web.
- Remote invitation E2E/acceptance chưa chạy vì BA4, W01 và email provider chưa có source.

### MA5 — Warning, SOS, snooze và drill M09/M10

- [x] M09 hiển thị exact deadline, thời gian còn lại và alert consequence.
- [x] Check-in từ M09 dùng cùng mutation/idempotency với M06.
- [x] Snooze chọn duration hữu hạn, hiển thị `ends_at`, confirm từ server.
- [x] M10 giữ ba giây, progress feedback, cancel gesture và haptic phù hợp.
- [x] Cung cấp accessible two-step SOS khi hold không thực hiện được.
- [x] Không hứa hẹn gọi cấp cứu/vị trí.
- [x] Drill dùng badge/copy riêng và confirmation trước khi gửi.
- [x] Correction state khi user check-in sau alert.

API phụ thuộc: `/safety-plan/snooze`, `/alerts/sos`, `/alerts/drill`, `/alerts/current`.

Exit: tap nhanh không gửi SOS; snooze không có tùy chọn vô thời hạn; drill không bị nhầm là alert thật.

Client implementation hoàn tất ngày 02/08/2026. `/alerts/current` projection là nguồn duy nhất
cho deadline, contact eligibility, channels, alert/delivery/correction state và allowed actions.
Check-in M06/M09 dùng chung hook/idempotency store. Snooze/SOS/drill có persisted key riêng và
chỉ commit sau response đúng contract. ADR:
`docs/adr/0005-mobile-authoritative-alert-actions.md`.

Bằng chứng kiểm chứng client MA5:

- Contract test từ chối snooze ngoài 1/4/8, duplicate preset, contact summary lệch và source
  alert không hợp lệ.
- Remote adapter test xác nhận `Idempotency-Key`, exact `snoozedUntil` và từ chối response SOS
  bị gắn nhãn drill.
- Fixture test bao phủ exact deadline, eligible contact, finite snooze, SOS replay cùng key,
  source drill riêng và correction queued sau check-in.
- Component test xác nhận tap/thả sớm không gửi; giữ liên tục đủ ba giây gọi đúng một lần.
- ESLint, TypeScript và 61 test case trong 22 suite đều xanh.
- `expo export --platform all` bundle thành công cho Android, iOS và web.
- Remote alert/provider/E2E chưa chạy vì BA6, worker, Expo/Gmail provider và staging chưa có.

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

1. Triển khai BA1–BA5 và worker scheduling/reconciliation để nghiệm thu MA2–MA3 ở `remote`.
2. Đối chiếu projection/status và error envelope với OpenAPI generated client trước integration gate.
3. Cấu hình Supabase redirect/Google, EAS project ID và kiểm tra auth/push trên development build, thiết bị thật.
4. Triển khai BA4, W01 và fake email provider; đối chiếu contract MA4 với OpenAPI rồi chạy
   invitation E2E, concurrent accept/decline và revoke-link test.
5. Triển khai BA6 + worker/provider, đối chiếu alert-context/check-in outcome với OpenAPI rồi
   chạy accelerated warning/SOS/drill/correction E2E trên staging.
6. Tiếp tục MA6 cho history/settings và account-data workflow.
7. Hoàn tất DI1 cho ba app còn lại, shared config và CI.
