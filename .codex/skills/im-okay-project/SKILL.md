---
name: im-okay-project
description: Xây dựng và duy trì ứng dụng I’m Okay, một hệ thống điểm danh an toàn cho người sống một mình. Dùng skill này khi phân tích, thiết kế, triển khai, kiểm thử hoặc review bất kỳ phần nào của mobile app, backend, worker, cơ sở dữ liệu, push notification, Gmail, quy trình check-in, cảnh báo quá hạn, liên hệ tin cậy, SOS, bảo mật hoặc khả năng mở rộng nhà cung cấp thông báo của dự án.
---

# I’m Okay Project

## Hiểu mục tiêu sản phẩm

Xây dựng một ứng dụng “safety check-in”: người dùng định kỳ xác nhận mình vẫn an toàn. Nếu không xác nhận trước thời hạn, backend tự động nhắc người dùng và thông báo cho các liên hệ tin cậy.

Ưu tiên theo thứ tự:

1. Bảo đảm quy trình cảnh báo đáng tin cậy.
2. Giữ thao tác điểm danh thật đơn giản.
3. Hạn chế báo động giả.
4. Bảo vệ dữ liệu cá nhân và vị trí.
5. Cho phép thay nhà cung cấp thông báo mà không sửa nghiệp vụ cốt lõi.

Không mô tả I’m Okay là thiết bị y tế, dịch vụ cứu hộ hoặc hệ thống bảo đảm cứu mạng. Luôn thể hiện đây là công cụ hỗ trợ kết nối người dùng với người họ tin tưởng.

## Phạm vi MVP hiện tại

Triển khai:

- Ứng dụng Android và iOS bằng React Native/Expo.
- Đăng nhập và quản lý hồ sơ.
- Thêm tối đa ba liên hệ tin cậy; yêu cầu liên hệ xác nhận lời mời.
- Chọn chu kỳ 24, 36 hoặc 48 giờ.
- Điểm danh bằng nút “Tôi vẫn ổn”.
- Hiển thị lần điểm danh cuối và thời hạn kế tiếp.
- Gửi push notification nhắc người dùng.
- Gửi email cảnh báo bằng Gmail SMTP.
- Cho người nhận mở liên kết bảo mật và phản hồi mà không cần cài app.
- Chuyển cảnh báo sang liên hệ tiếp theo nếu chưa có ai nhận xử lý.
- Tạm hoãn bảo vệ với thời gian tự bật lại.
- Lưu lịch sử check-in, cảnh báo, lần gửi và phản hồi.
- Cung cấp chế độ diễn tập cảnh báo không gây hiểu nhầm là sự cố thật.

Chưa triển khai:

- SMS, Zalo ZNS, WhatsApp hoặc cuộc gọi tự động.
- Tự động liên hệ cơ quan cấp cứu.
- Theo dõi vị trí liên tục.
- Ghi âm tự động.
- Nhận diện khuôn mặt, theo dõi bước chân hoặc smartwatch.
- AI đánh giá tình trạng người dùng.
- Thanh toán và gói thuê bao.

Để sẵn interface và trạng thái dữ liệu cho SMS/voice nhưng dùng adapter `disabled` trong MVP. Không tạo tích hợp giả hoặc gửi request ra nhà cung cấp chưa được cấu hình.

## Dùng quy tắc thời hạn duy nhất

Luôn định nghĩa:

```text
nextDeadlineAt = lastCheckInAt + checkInInterval
```

Hiểu “36 giờ” là cảnh báo tại thời điểm 36 giờ kể từ lần check-in gần nhất, không phải 36 giờ sau khi đã trễ một lịch điểm danh khác.

Với chu kỳ 36 giờ mặc định, dùng timeline ban đầu:

```text
24h  nhắc nhẹ bằng push
32h  nhắc khẩn bằng push
35h  cảnh báo còn một giờ bằng push + email cho chính người dùng
36h  kích hoạt alert và email liên hệ ưu tiên thứ nhất
38h  chưa ai nhận xử lý thì email các liên hệ còn lại
```

Cho phép điều chỉnh timeline sau khi có dữ liệu thử nghiệm, nhưng không rải công thức tính thời gian ở nhiều nơi. Tập trung toàn bộ phép tính trong domain service và kiểm thử nó độc lập.

## Mô hình trạng thái

Tách trạng thái kế hoạch bảo vệ khỏi trạng thái một cảnh báo.

```text
SafetyPlan: inactive | active | snoozed

Alert:
scheduled -> warning -> triggered -> acknowledged -> resolved
                   \-> cancelled
```

Áp dụng các quy tắc:

- Chỉ một alert chưa kết thúc được tồn tại cho mỗi safety plan.
- Một check-in hợp lệ phải cập nhật deadline và hủy các job chưa chạy của chu kỳ cũ.
- Không tự động đánh dấu `resolved` chỉ vì email đã được gửi.
- `delivered` chỉ mô tả trạng thái kênh gửi; `acknowledged` nghĩa là một người đã nhận xử lý.
- Cho phép người dùng hủy alert trước khi gửi cho liên hệ.
- Sau khi đã gửi cho liên hệ, lưu audit log và gửi thông báo đính chính nếu người dùng xác nhận an toàn.

## Dùng kiến trúc mục tiêu

```text
Expo mobile/web
      |
      v
NestJS REST API ------ PostgreSQL/Supabase
      |
      v
Redis/BullMQ ------ NestJS worker
                       |-- Expo Push
                       |-- Gmail Email
                       |-- SMS adapter (disabled)
                       `-- Voice adapter (disabled)
```

Dùng:

- TypeScript trong toàn bộ repository.
- Expo + Expo Router cho mobile và trang phản hồi mở từ deep link.
- TanStack Query cho server state; chỉ dùng local state library khi thực sự cần.
- React Hook Form + Zod cho form và validation.
- NestJS REST API; sinh OpenAPI schema cho các endpoint công khai.
- Supabase Auth và hosted PostgreSQL.
- Prisma cho schema, migration và truy cập dữ liệu từ backend.
- BullMQ + Redis cho delayed job, retry và worker tách biệt.
- Expo Push Notifications trong MVP.
- Nodemailer với Gmail SMTP/App Password trong MVP.
- Sentry cho lỗi mobile, API và worker.

Không để mobile ghi trực tiếp các bảng nghiệp vụ quan trọng như `alerts`, `notification_deliveries` hoặc `audit_logs`, kể cả khi Supabase có REST API tự sinh. Đi qua backend để giữ các bất biến nghiệp vụ.

## Coi PostgreSQL là nguồn sự thật

Lưu deadline và trạng thái chính trong PostgreSQL. Chỉ dùng Redis/BullMQ để thực thi công việc.

Khi check-in:

1. Xác thực người dùng và safety plan đang hoạt động.
2. Khóa hoặc dùng transaction để chống hai check-in đồng thời.
3. Ghi một `check_ins` record với idempotency key.
4. Cập nhật `last_check_in_at` và `next_deadline_at`.
5. Kết thúc alert cũ nếu phù hợp.
6. Sau khi transaction commit, tạo lại các delayed job.

Chạy một reconciliation job định kỳ để tìm deadline hoặc alert chưa có job tương ứng. Phải có khả năng dựng lại toàn bộ queue từ dữ liệu PostgreSQL sau khi Redis bị mất.

## Thiết kế notification adapter

Giữ nghiệp vụ cảnh báo độc lập với nhà cung cấp:

```ts
type NotificationChannel = 'push' | 'email' | 'sms' | 'voice';

interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: OutboundNotification): Promise<ProviderResult>;
}
```

Định tuyến qua `NotificationDispatcher`; không gọi Expo hoặc Nodemailer trực tiếp từ alert domain service.

Mỗi lần gửi phải có:

- `notification_delivery.id`
- `idempotency_key`
- `provider`
- `provider_message_id` nếu có
- `status`: queued, sent, delivered, failed hoặc unknown
- số lần thử và lỗi gần nhất

Xử lý job theo nguyên tắc at-least-once nhưng ngăn tác dụng phụ trùng bằng idempotency key. Không coi retry là một lần cảnh báo mới.

## Cấu hình Gmail cho MVP

Dùng Gmail chỉ như một adapter tạm thời. Đọc bí mật từ môi trường:

```text
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM_NAME=I'm Okay
PUBLIC_APP_URL=
```

Không commit App Password, access token hoặc địa chỉ email cá nhân vào source. Yêu cầu bật xác minh hai bước trên tài khoản Google trước khi tạo App Password.

Bao bọc Gmail trong `GmailEmailProvider` để sau này thay bằng Resend, Amazon SES hoặc nhà cung cấp khác mà không đổi alert workflow. Ghi trạng thái `sent` khi Gmail chấp nhận yêu cầu; không suy diễn rằng người nhận đã đọc.

## Xử lý push notification

Lưu nhiều device token cho một người dùng. Theo dõi platform, thời điểm cập nhật và trạng thái token. Vô hiệu hóa token khi nhà cung cấp báo token không còn hợp lệ.

Không dùng local notification hoặc tác vụ nền trên điện thoại làm bộ đếm chính. Mobile có thể lên lịch nhắc cục bộ như lớp phụ trợ, nhưng backend phải quyết định deadline và phát cảnh báo.

Push chỉ là kênh nhắc trong MVP. Ghi rõ giới hạn này trong UI onboarding: ứng dụng cần Internet và push có thể bị chặn bởi cài đặt hệ điều hành.

## Bắt đầu với mô hình dữ liệu

Tạo tối thiểu các entity:

```text
users
user_devices
safety_plans
trusted_contacts
contact_invitations
check_ins
alerts
alert_steps
alert_responses
notification_deliveries
audit_logs
```

Lưu mọi timestamp ở UTC và chuyển sang múi giờ người dùng khi hiển thị. Lưu `timezone` dạng IANA, ví dụ `Asia/Ho_Chi_Minh`. Không lưu deadline chỉ bằng giờ/phút địa phương.

Không xóa cứng check-in, alert hoặc delivery log qua API người dùng. Khi cần quyền xóa dữ liệu, dùng quy trình riêng có audit và chính sách lưu giữ rõ ràng.

## Bảo vệ liên kết phản hồi

Cho liên hệ phản hồi qua URL dùng một lần hoặc token có hạn. Chỉ lưu hash của token trong database. Giới hạn quyền của link vào đúng alert và đúng contact.

Không để link công khai hiển thị dữ liệu y tế, vị trí hoặc toàn bộ danh sách liên hệ. Khi cần chia sẻ vị trí trong tương lai, hiển thị thời điểm thu thập và hết hạn quyền xem.

Xác minh webhook từ mọi nhà cung cấp bằng chữ ký chính thức. Áp dụng rate limit cho đăng nhập, check-in, gửi lại lời mời và phản hồi alert.

## Thiết kế trải nghiệm

Giữ màn hình chính tập trung vào:

```text
Bạn có ổn không?
[ Tôi vẫn ổn ]
Lần xác nhận gần nhất
Thời hạn kế tiếp
```

Yêu cầu xác nhận mạnh hơn khi tắt bảo vệ, thay đổi liên hệ hoặc hủy cảnh báo đã kích hoạt; không bắt nhập PIN cho mọi check-in.

Mọi chế độ snooze phải có `ends_at`. Không cung cấp snooze vô thời hạn trên màn hình chính. Phân biệt rõ “diễn tập” và “cảnh báo thật” trong tiêu đề, màu sắc và nội dung email.

Đáp ứng khả năng truy cập: vùng bấm lớn, tương phản tốt, không chỉ dùng màu để biểu đạt trạng thái và hỗ trợ trình đọc màn hình.

## Kiểm thử các rủi ro trước

Viết unit test cho:

- Mọi preset 24/36/48 giờ.
- Múi giờ và thay đổi timezone.
- Check-in ngay trước hoặc đúng lúc deadline.
- Hai request check-in đồng thời.
- Snooze hết hạn.
- Hủy alert sau khi một phần notification đã gửi.

Viết integration test cho:

- API -> database -> queue -> worker.
- Retry Gmail/Expo nhưng không gửi trùng.
- Worker restart giữa lúc xử lý job.
- Redis trống và reconciliation dựng lại job.
- Liên hệ thứ nhất không phản hồi và hệ thống chuyển tiếp.
- Token phản hồi hết hạn hoặc đã dùng.

Không dùng Gmail hoặc Expo thật trong test mặc định. Cung cấp fake provider ghi lại request; chỉ chạy smoke test bên ngoài khi có biến môi trường chuyên dụng.

## Tuân theo quy trình khi thay đổi dự án

1. Đọc skill này và kiểm tra source hiện có trước khi đề xuất kiến trúc mới.
2. Xác định thay đổi thuộc mobile, API, worker, data hay notification.
3. Viết hoặc cập nhật domain invariant và test trước phần tích hợp dễ lỗi.
4. Dùng migration tiến về phía trước; không phá dữ liệu người dùng hiện có.
5. Tách nhà cung cấp khỏi nghiệp vụ bằng interface.
6. Chạy lint, typecheck, unit test và integration test liên quan.
7. Ghi rõ giới hạn an toàn còn tồn tại khi bàn giao.

Không thêm AI, SMS, voice, vị trí liên tục hoặc thanh toán chỉ vì chúng có trong roadmap. Chỉ triển khai khi người dùng yêu cầu mở rộng phạm vi.

## Xác định hoàn thành

Chỉ coi một tính năng cảnh báo hoàn thành khi:

- Có trạng thái và bất biến nghiệp vụ rõ ràng.
- Chạy trên backend, không phụ thuộc app đang mở.
- Có idempotency và retry phù hợp.
- Có audit log cho tác vụ quan trọng.
- Có test đường thành công và ít nhất một đường lỗi.
- Không làm lộ bí mật hoặc dữ liệu của contact.
- UI mô tả trung thực giới hạn của hệ thống.

