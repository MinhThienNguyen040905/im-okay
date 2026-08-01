# I’m Okay — Trusted-contact web implementation plan

## 1. Mục tiêu và phạm vi

Xây responsive web mở từ email cho liên hệ tin cậy. Người nhận không cần cài app hay đăng nhập; quyền truy cập được giới hạn bằng invitation/alert token có thời hạn.

Bao gồm:

| ID | Màn hình | Mục đích |
|---|---|---|
| W01 | Xác nhận lời mời | Accept/decline trusted-contact invitation |
| W02 | Chi tiết cảnh báo | Hiển thị tối thiểu ai cần được kiểm tra |
| W03 | Chọn hành động | Acknowledge/chọn cách xử lý |
| W04 | Theo dõi xử lý | Hiển thị việc đã nhận xử lý |
| W05 | Kết quả cảnh báo | Resolved/cancelled/forwarded result |

State bắt buộc: loading, network error, invalid, expired, used, revoked, rate-limited, concurrent-update, cancelled và resolved.

Ngoài phạm vi: account dashboard, marketing navigation, contact login, map/vị trí, health data, full contact list và token administration UI.

## 2. Nguyên tắc public-link

- Token đủ entropy, chỉ lưu hash ở backend.
- Token scope đúng resource/contact/action; expiry và revoke được enforce server-side.
- GET chỉ xem; mutation dùng POST và atomically consume/transition khi cần.
- Không log URL/token và không gửi token vào analytics/Sentry.
- Dùng `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, CSP và HTTPS.
- Không nhúng third-party asset/analytics có thể nhận referrer trên token page.
- Sau mutation, thay URL/history để giảm khả năng token còn trong thanh địa chỉ nếu runtime cho phép.
- Error message không phân biệt quá chi tiết token không tồn tại/hết hạn/revoke.

## 3. Kiến trúc web

```text
Expo Router web route
      |
Public token loader
      |
Typed API client
      |
NestJS public endpoints
      |
Scoped invitation/alert projection
```

Nguyên tắc:

- Deploy riêng `apps/contact-web`; không phụ thuộc mobile auth bundle.
- Mobile-first 390 px; adapt 768/1440 px bằng centered content, không biến thành dashboard rộng.
- Dùng typed contracts/OpenAPI; không tự tạo shape khác API.
- Không persist public token trong localStorage, analytics state hoặc global error object.
- Hạn chế caching; response chứa dữ liệu alert dùng `Cache-Control: no-store`.
- Chỉ hiển thị projection dữ liệu tối thiểu do API trả về.

## 4. Giai đoạn triển khai

### WA0 — Design readiness

- [ ] Chốt W01–W05 selected versions và footer branding.
- [ ] Tạo invalid/expired/used/revoked/cancelled/resolved variants.
- [ ] Nối W02→W03→W04→W05 prototype.
- [ ] QA 390/768/1440 px, keyboard-only và zoom 200%.
- [ ] Xác nhận copy bình tĩnh, không hứa hẹn cứu hộ.

### WA1 — Web foundation

- [ ] Scaffold Expo Router web và TypeScript strict.
- [ ] Tái sử dụng design tokens/component phù hợp từ `packages/ui`.
- [ ] Route groups cho invitation và alert response.
- [ ] Public API client không gắn app auth headers/cookies không cần thiết.
- [ ] Error boundary và Sentry scrub URL/query.
- [ ] Security headers và no-store/noindex verification.

Exit: deploy preview mở trên mobile/desktop, không có marketing/account navigation.

### WA2 — Invitation W01

- [ ] Loader lấy invitation projection qua opaque token.
- [ ] Hiển thị tên người mời, vai trò và giới hạn trách nhiệm.
- [ ] Accept/decline dùng POST, pending state và duplicate-submit guard.
- [ ] Success state không còn hiển thị token.
- [ ] Invalid/expired/used/revoked generic outcomes.
- [ ] Concurrent accept/decline map sang kết quả server hiện tại.

API phụ thuộc: public invitation read/accept/decline trong Plan 03.

Exit: refresh/back/duplicate submit không tạo transition trùng.

### WA3 — Alert detail và action W02/W03

- [ ] W02 hiển thị tối thiểu tên người cần kiểm tra, thời điểm và alert/drill label.
- [ ] Không hiển thị địa chỉ, vị trí, sức khỏe, device hoặc contact khác.
- [ ] W03 cho phép acknowledge/nhận xử lý, báo đã liên hệ, chuyển tiếp theo policy.
- [ ] Mỗi action có mô tả hệ quả và confirmation nếu khó đảo ngược.
- [ ] Chặn double submit và hiển thị authoritative concurrent result.
- [ ] Drill copy không thể nhầm với alert thật.

API phụ thuộc: public alert projection/action endpoints trong Plan 03.

### WA4 — Tracking và result W04/W05

- [ ] W04 hiển thị action đã ghi nhận và bước tiếp theo.
- [ ] Poll/refetch với backoff hợp lý nếu cần theo dõi status; dừng khi terminal.
- [ ] W05 hiển thị resolved/cancelled/corrected/forwarded/expired.
- [ ] Không suy diễn safe chỉ vì email delivered hoặc contact acknowledged.
- [ ] Có kết thúc rõ; không để người dùng ở dead end không biết trạng thái.

### WA5 — Hardening và release

- [ ] Keyboard-only, focus order, visible focus, screen reader và 200% zoom.
- [ ] Responsive visual regression ở 390/768/1440 px.
- [ ] Slow/offline/network retry states.
- [ ] Token không xuất hiện trong log, Sentry, analytics hoặc DOM sau submit.
- [ ] CSP/referrer/no-store/noindex automated checks.
- [ ] E2E invitation, alert, concurrent response, expired/used/revoked.
- [ ] Deploy staging/production với domain và HTTPS.

## 5. API projection tối thiểu

Invitation page có thể nhận:

- Tên hiển thị người mời.
- Invitation state/expiry theo copy an toàn.
- Các action hiện có.

Alert page có thể nhận:

- Tên hiển thị người được bảo vệ.
- Alert type: real/drill/SOS.
- Triggered/updated timestamp và status hiện tại.
- Action mà token/contact được phép thực hiện.
- Copy/version hoặc safe display metadata cần thiết.

Không trả full user/contact/alert database object.

## 6. Kiểm thử

Unit/component:

- Token-state to UI-state mapping.
- Confirmation và duplicate-submit guard.
- Drill/real alert label.
- Terminal-state polling stop.

Integration:

- API error envelope và cache headers.
- Concurrent action response.
- URL/Sentry scrub.

E2E:

- Invitation accept/decline.
- Invalid/expired/used/revoked invitation.
- W02→W05 normal alert.
- Nhiều contact submit gần đồng thời.
- User correction/cancel trong khi contact đang xem.
- Responsive, keyboard và screen reader smoke.

## 7. Definition of Done

- W01–W05 và terminal/error states đầy đủ.
- Không yêu cầu account/app install.
- Dữ liệu hiển thị tối thiểu và token không rò qua log/referrer/cache.
- Responsive 390/768/1440 px và accessibility gate đạt.
- Concurrent/expired/used/revoked behavior do server quyết định và E2E được test.
- Copy nói rõ I’m Okay không phải dịch vụ cứu hộ.

## 8. Bước tiếp theo

1. Hoàn tất WA0 trong Stitch.
2. Chốt ADR runtime/hosting cùng Plan 05.
3. Implement WA1; WA2 bắt đầu sau khi public invitation contract ổn định.

