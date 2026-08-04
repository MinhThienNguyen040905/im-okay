# ADR 0006 — Mobile history và settings dùng safe projection authoritative

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, M11/M12, contract phụ thuộc S3

> Cập nhật 2026-08-04: dependency backend/OpenAPI cũ được ánh xạ sang Supabase Edge
> Functions/RPC và versioned contracts theo ADR 0008. Safe projection MA6 không đổi.

## Bối cảnh

MA6 đưa lịch sử hoạt động, chỉnh hồ sơ/múi giờ/chu kỳ, trạng thái push, tắt kế hoạch an toàn và
yêu cầu export/delete vào mobile. Đây là các bề mặt dễ làm lộ token, email/provider error hoặc
làm người dùng hiểu sai rằng deadline/account workflow đã đổi chỉ vì client cập nhật local.
Backend S3 chưa tồn tại trong repository nên client cần một contract đủ chặt để phát triển và
kiểm thử trước, nhưng fixture không được giả làm bảo vệ thật.

## Quyết định

- `GET /v1/history?limit=&cursor=` trả cursor page mới nhất trước, tối đa 50 item mỗi trang.
  Cursor là chuỗi opaque; mobile chỉ chuyển tiếp, không đọc hoặc hiển thị.
- History item dùng finite event enum: check-in, reminder, snooze, alert, contact response,
  correction và drill. Metadata chỉ allowlist timestamp, duration, channel `push | email` và
  source. Zod object là strict nên provider error, delivery token, contact email và field lạ bị
  từ chối trước presentation.
- UI tự ánh xạ enum sang wording bình tĩnh; không render message tùy ý từ provider. Drill luôn
  có wording và badge `DIỄN TẬP`, không chỉ phân biệt bằng màu. Timeline hỗ trợ cursor pagination,
  pull-to-refresh, dedupe id, loading/empty/error và filter tại client trên các page đã tải.
- `GET /v1/me/settings` trả một settings projection gồm profile, safety plan/exact deadline,
  contact counts, device registration, account request state và allowed actions. Push readiness
  trên UI là kết hợp quyền OS hiện tại với registration state của server.
- Profile/timezone và chu kỳ là hai mutation riêng để tránh một form báo atomic success khi chỉ
  một phần thành công. `PATCH /v1/me` và `PUT /v1/safety-plan` phải trả full projection mới;
  interval/timezone chỉ được commit vào local onboarding cache sau response. Mobile không cộng
  giờ hoặc tự tạo production deadline.
- Các response update được kiểm tra thêm theo intent: profile/timezone phải khớp input; đổi chu
  kỳ phải trả đúng interval, plan còn hoạt động và exact deadline; disable phải trả
  `state=inactive` cùng `nextDeadlineAt=null`; export/delete phải trả request state không null.
- Disable dùng native destructive confirmation và `Idempotency-Key` persisted. Backend vẫn phải
  enforce recent authentication/reauthentication theo policy; client không tự coi confirm dialog
  là re-auth. Export/delete là request workflow, không xóa hay xuất dữ liệu trực tiếp trên máy.
- Disable, export và delete có idempotency scope riêng, giữ cùng key khi outcome chưa chắc chắn
  và chỉ xóa key sau response hợp lệ. Success copy luôn nói “máy chủ đã xác nhận/tiếp nhận”.
- Mutation thành công invalidates safety status/history và đồng bộ cache hiển thị. Không có
  optimistic update cho deadline, plan state hoặc account request.
- `features/history/fixtureApi.ts` và `features/settings/fixtureApi.ts` là fake server local duy
  nhất được tính deadline phục vụ UI/test. Fixture luôn đi kèm cảnh báo không có bảo vệ, push,
  email hoặc account processing thật.

## Hệ quả

- M11/M12 client có thể kiểm thử contract và interaction trước S3 mà không làm loãng privacy
  boundary hoặc authoritative scheduling rule.
- History filter chỉ lọc tập page đã tải; backend vẫn chịu trách nhiệm projection đầy đủ, thứ tự,
  cursor ổn định và authorization theo user. Nếu cần filter server-side sau này, contract và query
  key phải được version/cập nhật cùng nhau.
- Remote acceptance MA6 còn phụ thuộc S3–S4, retention policy, recent-auth enforcement, contract
  compatibility và staging tests. Expo push readiness vẫn cần EAS project ID, development build
  và thiết bị thật.
