# I’m Okay — hướng dẫn cho agent

Đây là điểm vào bắt buộc cho mọi session mới trong repository.

## Đọc theo thứ tự

1. `README.md` — sản phẩm, kiến trúc, cách chạy và bản đồ repository.
2. `docs/PROJECT-STATUS.md` — nguồn duy nhất cho tiến độ, build gần nhất, blocker và việc tiếp theo.
3. Chỉ đọc tài liệu chuyên biệt khi công việc chạm tới nó:
   - `design/stitch/README.md` và `design/stitch/DESIGN.md` cho UI/UX.
   - `docs/adr/` cho quyết định kiến trúc đã chốt.
   - `docs/release/` cho build, staging, privacy và incident.
   - `docs/qa/` cho ma trận thiết bị và mẫu evidence.

Không tìm `docs/plans/`: các plan cũ đã được xóa sau khi hoàn thành và được thay bằng
`docs/PROJECT-STATUS.md`.

## Trạng thái ngắn gọn

- Android personal pilot chạy với mobile Expo/React Native và backend Supabase cloud.
- Mobile M01–M12, contact web W01–W05 và luồng check-in/contact/alert cốt lõi đã được triển khai.
- APK staging mới nhất được ghi trong `docs/PROJECT-STATUS.md`; không suy ra build mới chỉ từ source.
- P3 internal release chưa hoàn tất: iOS/TestFlight, store rollout, Sentry production readiness,
  legal/support owner và hosted backup/restore vẫn còn mở.
- Notification delivery là trạng thái vận hành có thể thay đổi. Phải chạy preflight/ops check trước
  thử nghiệm có side effect; không dựa vào ghi chú lịch sử để kết luận nó đang bật.

## Nguồn sự thật

Ưu tiên khi có xung đột:

1. Invariant an toàn và bảo mật trong file này.
2. Code, migration và automated test đang chạy.
3. ADR trong `docs/adr/`.
4. `docs/PROJECT-STATUS.md` cho tiến độ và release gate.
5. `design/stitch/` cho visual intent; source React Native/web mới là implementation thực tế.

## Invariant không được phá

- I’m Okay là công cụ hỗ trợ kết nối, không phải dịch vụ cứu hộ hay thiết bị y tế.
- PostgreSQL/Supabase là nguồn authoritative cho deadline và alert; client không tự tính deadline thật.
- Check-in và mutation quan trọng không được hiển thị thành công trước khi server xác nhận.
- Mọi mutation phải giữ authorization, RLS/RPC boundary và idempotency.
- Public invitation/alert token không được log, lưu raw trong database hoặc đưa vào analytics.
- SOS cần giữ ba giây hoặc accessible two-step; snooze luôn có thời điểm kết thúc.
- Không gửi push/email thật, bật delivery, deploy, đổi secret hoặc chạy dữ liệu production nếu yêu cầu
  hiện tại không cho phép rõ ràng.
- Không commit service-role key, SMTP password, FCM credential hoặc secret khác.

## Bản đồ code

- `apps/mobile/`: Expo SDK 57, Expo Router, Android/iOS app.
- `apps/contact-web/`: responsive public web cho trusted contact.
- `packages/contracts/`: contract dùng chung.
- `supabase/migrations/`: schema, RLS, RPC, Cron và Queues.
- `supabase/functions/`: authenticated/public API, notification consumer, receipts và ops.
- `scripts/`: smoke, preflight, security và observability tooling.

## Quy tắc làm việc

- Bắt đầu bằng `git status --short`; không ghi đè thay đổi không liên quan.
- Đọc source/test hiện có trước khi thay kiến trúc hoặc contract.
- Thay đổi schema bằng migration mới; không sửa migration đã chạy trên shared environment.
- Thay đổi framework/provider/state machine/invariant phải cập nhật hoặc thêm ADR.
- UI phải giữ tiếng Việt đúng dấu, touch target tối thiểu 48×48, trạng thái không chỉ dựa vào màu
  và chỉ có một primary CTA rõ ràng mỗi màn hình.
- Sau thay đổi đáng kể, cập nhật `docs/PROJECT-STATUS.md`; không tạo thêm roadmap/plan tiến độ song song.

## Kiểm tra chuẩn

Chọn phạm vi phù hợp, ưu tiên các script thật trong `package.json`:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Với mobile có thể chạy riêng:

```powershell
npm --prefix apps/mobile run lint
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test
npm --prefix apps/mobile run build
```

Không coi compile thành công là bằng chứng provider, notification, backup hoặc release đã hoạt động.
