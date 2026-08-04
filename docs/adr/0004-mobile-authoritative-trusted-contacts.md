# ADR 0004 — Mobile trusted contacts và invitation status authoritative

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, M07/M08

> Cập nhật 2026-08-04: dependency backend/OpenAPI cũ được ánh xạ sang Supabase Edge
> Functions/RPC và versioned contracts theo ADR 0008. Contract authoritative MA4 không đổi.

## Bối cảnh

MA4 cần cho người dùng thêm tối đa ba liên hệ, đổi thứ tự, gửi lại lời mời và xóa liên hệ
trước khi backend/contact web S3 tồn tại. Sai lầm nguy hiểm nhất là mobile tự đánh dấu một người đã
xác nhận, cập nhật danh sách lạc quan khi server chưa commit, hoặc quảng bá email/SMS đã gửi
trong chế độ fixture.

Bản M07 trên Stitch là hướng trình bày được chọn. Bản M08 đang lưu trên Stitch vẫn chứa trường
phone/SMS của một iteration cũ, trong khi owner plan và phạm vi MVP chỉ cho phép tên/email.

## Quyết định

- `GET /v1/trusted-contacts` trả projection gồm `serverTime`, `maxContacts: 3` và danh sách
  contact. Mỗi contact có `id`, `displayName`, `email`, `priority` cùng invitation projection:
  `status`, `sentAt`, `expiresAt`, `resendAvailableAt`.
- Invitation status là enum server-owned: `pending`, `accepted`, `declined`, `expired` hoặc
  `revoked`. Mobile chỉ dịch `accepted` thành copy “Đã xác nhận”; không có mutation hay local
  action nào tự tạo trạng thái đó.
- Mọi mutation add/remove/reorder/resend phải trả lại cùng full projection có `serverTime`.
  TanStack Query chỉ commit response đã qua Zod; không optimistic update. Sau commit, client
  refetch để phát hiện thay đổi đồng thời.
- Tạo contact gửi đúng `displayName`, `email` và `consentConfirmed: true`. Không thu thập hoặc
  gửi phone/SMS trong MVP. Contact mới được backend xếp cuối; người dùng đổi priority tại M07.
- Reorder gửi toàn bộ `orderedContactIds` trong một request để backend áp dụng atomically.
- Cooldown hiển thị từ `resendAvailableAt` và server-clock offset. Server vẫn phải rate-limit.
  Error code chính là `INVITATION_COOLDOWN`, kèm `details.retryAt` khi có. Client cũng hiểu
  alias `RESEND_COOLDOWN` trong giai đoạn trước versioned contract để tránh làm mất safe copy.
- Duplicate/max-limit và conflict dùng code `CONTACT_DUPLICATE`, `CONTACT_LIMIT_REACHED`,
  `CONTACT_REORDER_CONFLICT`. Client không hiển thị message nội bộ do server gửi; code được
  map sang copy an toàn và request ID chỉ dành cho chẩn đoán.
- Xóa contact luôn qua native destructive confirmation. Backend phải revoke invitation link
  còn hiệu lực trong cùng transaction; client không tuyên bố thành công trước response.
- M07 refetch khi focus, app foreground hoặc người dùng mở push. Vì vậy acceptance tại W01
  xuất hiện sau lần đồng bộ tiếp theo mà không cần client suy diễn.
- `features/trusted-contacts/fixtureApi.ts` là fake server local. Nó thực thi max/duplicate,
  reorder/remove và cooldown để test UI, không gửi email thật, không cung cấp action giả lập
  acceptance và luôn có badge/copy cảnh báo dữ liệu mẫu.

## Hệ quả

- M07/M08, validation và các state mutation có thể phát triển độc lập với S3 mà vẫn giữ đúng
  trust boundary.
- Remote acceptance còn phụ thuộc S3, invitation token/transaction, W01, email provider và
  contract compatibility. Client MA4 hoàn tất không đồng nghĩa lời mời hoặc cảnh báo thật đã
  hoạt động.
- Relationship/edit-contact chưa nằm trong MA4 contract. Nếu bổ sung sau này cần cập nhật
  versioned contract, form, privacy notice và Stitch cùng lúc.
