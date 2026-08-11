# I’m Okay — Privacy, terms và safety notice readiness

Tài liệu này là source of truth để chốt nội dung public trước internal alpha. Đây không phải tư vấn
pháp lý và không được publish nguyên trạng khi các mục `OWNER REQUIRED` chưa được điền và phê duyệt.

## 1. Safety notice bắt buộc

I’m Okay là công cụ hỗ trợ người dùng duy trì check-in và liên lạc với các liên hệ tin cậy. I’m Okay
không phải dịch vụ cứu hộ, tổng đài khẩn cấp, thiết bị y tế hoặc hệ thống giám sát được bảo đảm luôn
hoạt động. Ứng dụng không tự gọi dịch vụ khẩn cấp và không chia sẻ vị trí. Khi có nguy hiểm tức thời,
người dùng hoặc liên hệ phải gọi số khẩn cấp tại nơi họ đang ở và không chờ thông báo từ I’m Okay.

Thông báo có thể đến muộn hoặc không đến do thiết bị tắt, mất mạng, quyền push bị tắt, provider hoặc
hệ thống gặp sự cố. Liên hệ tin cậy phải tự quyết định cách hỗ trợ; việc nhận email/push không chứng
minh đã có sự cố và thao tác của liên hệ không thay thế xác minh ngoài đời thực.

## 2. Dữ liệu MVP thực sự xử lý

| Nhóm dữ liệu         | Mục đích                                                                                       | Nơi xử lý/lưu trữ hiện tại                            |
| -------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Tài khoản            | Email, định danh Supabase Auth, thời điểm xác thực                                             | Supabase staging/production tương ứng                 |
| Hồ sơ                | Tên hiển thị, múi giờ, trạng thái tài khoản                                                    | PostgreSQL/Supabase                                   |
| Kế hoạch an toàn     | Chu kỳ 24/36/48 giờ, deadline, snooze, trạng thái                                              | PostgreSQL/Supabase                                   |
| Check-in và cảnh báo | Thời điểm, nguồn check-in/SOS/drill, trạng thái và phản hồi                                    | PostgreSQL/Supabase                                   |
| Liên hệ tin cậy      | Tên, email, thứ tự ưu tiên và trạng thái consent                                               | PostgreSQL/Supabase                                   |
| Thông báo            | Expo push token, recipient reference, template, delivery/receipt status và error code đã scrub | Supabase, Expo Push và email provider                 |
| Vận hành và bảo mật  | Correlation ID, audit event, queue/outbox state, rate-limit bucket                             | Supabase; không đưa raw public token vào log/evidence |

MVP không yêu cầu vị trí, danh bạ thiết bị, microphone, ảnh, health data hoặc SMS/voice. Public
invitation/alert token chỉ lưu dưới dạng SHA-256 digest; raw token chỉ nằm trong link gửi cho đúng
người nhận. Evidence không được chứa raw token, credential, email/số điện thoại thật hoặc body email.

## 3. Provider và bên xử lý hiện tại

- Supabase: Auth, PostgreSQL, RLS/RPC, Edge Functions, Cron, Queue và Vault.
- Expo Push + Firebase Cloud Messaging: transport push Android; không phải application backend.
- Dedicated Gmail SMTP: chỉ dùng tạm cho personal pilot có giám sát; phải đổi sang verified-domain
  provider trước beta/production.
- Vercel: host contact web staging; URL token không được gửi vào analytics/log.
- Sentry: code scrub đã có nhưng staging upload/config hiện tắt. Chỉ được bật sau khi event scrub và
  source-map symbolication được nghiệm thu.

Danh sách trên phải được owner cập nhật nếu provider, region hoặc purpose thay đổi.

## 4. Quyền và workflow hiện có

- Người dùng xem/chỉnh hồ sơ, múi giờ, chu kỳ; có thể tắt safety plan và đăng xuất.
- Người dùng có thể gửi yêu cầu export hoặc deletion sau recent authentication. Backend hiện chỉ ghi
  nhận/audit yêu cầu; chưa có worker hoàn tất export/deletion hoặc thời hạn xử lý đã cam kết.
- Liên hệ tin cậy có thể accept/decline invitation và acknowledge/resolve/cannot-help qua bearer link.
- Client không có service-role key và không được đọc trực tiếp bảng domain nhạy cảm.

Không được mô tả export/deletion là đã hoàn tất tự động cho đến khi workflow xử lý thật, retention và
SLA được triển khai/test.

## 5. OWNER REQUIRED trước khi publish

- [ ] Tên pháp lý/cá nhân chịu trách nhiệm vận hành và địa chỉ/khu vực pháp lý áp dụng.
- [ ] Email support và email privacy/security; cả hai đã nhận thử và có người trực.
- [ ] Ngày hiệu lực, độ tuổi tối thiểu và căn cứ/consent phù hợp với thị trường phát hành.
- [ ] Retention cụ thể cho account, check-in/alert, audit, notification log, rate-limit và backup.
- [ ] Thời hạn xử lý export/deletion, cơ chế xác minh danh tính, ngoại lệ giữ dữ liệu và cách thông báo
      hoàn tất.
- [ ] Danh sách subprocessors, region, transfer/disclosure và link chính sách của từng provider.
- [ ] Quy trình sửa sai, rút consent contact, khiếu nại và yêu cầu bảo mật.
- [ ] Legal review cho Privacy Policy, Terms of Use và store data-safety/privacy labels.

## 6. Publish gate

Chỉ đánh dấu hàng `privacy/terms/support` trong Plan 03 là đạt khi các mục owner ở trên đã đóng, URL
public HTTPS tồn tại, link trong mobile/contact web mở đúng trang, nội dung khớp store declaration và
đã chạy kiểm tra keyboard/screen reader/no-cache/no-referrer. Cho đến lúc đó tài liệu này chỉ giúp
khóa phạm vi và ngăn release copy hứa quá khả năng hệ thống.
