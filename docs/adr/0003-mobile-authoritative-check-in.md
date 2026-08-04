# ADR 0003 — Mobile authoritative status và check-in MA3

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`, M06

> Cập nhật 2026-08-04: dependency API/worker/OpenAPI cũ được ánh xạ sang Supabase Edge
> Functions, Cron/Queues và versioned contracts theo ADR 0008. Contract authoritative MA3 không đổi.

## Bối cảnh

M06 cần hiển thị countdown và cho phép check-in trước khi backend S2 tồn tại. Sai lầm nguy
hiểm nhất ở client là tự tính deadline, báo check-in thành công khi request chưa được xác nhận
hoặc tạo check-in thứ hai khi retry sau timeout.

## Quyết định

- `GET /v1/safety-plan/status` và `POST /v1/check-ins` phải trả cùng một projection gồm
  `serverTime`, trạng thái plan, chu kỳ, `lastCheckInAt`, `nextDeadlineAt`, contact summary và
  current-alert summary tối thiểu. Zod từ chối response thiếu `serverTime` hoặc timestamp ISO.
- Mobile không cộng chu kỳ để tạo deadline ở remote mode. Countdown chỉ lấy
  `nextDeadlineAt - (Date.now() + clockOffset)`. Clock offset ước lượng từ `serverTime` và
  midpoint của request/response, sau đó resync khi app foreground hoặc người dùng mở push.
- Mốc dưới bốn giờ chỉ điều khiển cách trình bày `approaching`; nó không trigger alert,
  notification hay state transition.
- Mỗi check-in tạo UUID client trong Secure Random (`expo-crypto`) và gửi qua header
  `Idempotency-Key`. Key được lưu cục bộ tối đa 15 phút để offline/timeout retry dùng đúng key.
  Thành công hoặc lỗi dứt điểm xóa key; lỗi retryable giữ key.
- Mutation không tự retry nền. CTA bị khóa khi pending. Success sheet chỉ xuất hiện sau khi
  response đã qua schema; cache được cập nhật bằng response rồi refetch projection mới.
- Timeout client là 12 giây. Timeout/offline luôn dùng copy “chưa được ghi nhận” và giữ
  deadline cũ; không optimistic update.
- TanStack Query giữ server state. Background refresh lỗi vẫn hiển thị snapshot gần nhất kèm
  cảnh báo stale, không thay bằng deadline suy đoán.
- `fixtureApi.ts` là fake server chỉ cho `EXPO_PUBLIC_DATA_MODE=fixture` ở local. Phép tính
  deadline mô phỏng được cô lập trong file này và UI luôn hiển thị “không có bảo vệ thật”;
  remote adapter không import công thức deadline.
- M06 có entry routes sang contacts, warning và SOS. Tại MA3 các route này chỉ là placeholder
  không mutation; M07 thuộc MA4, M09/M10 thuộc MA5.

## Hệ quả

- Client MA3 có thể kiểm thử đầy đủ loading, success, retry, duplicate-tap và stale-state UX
  trước backend, nhưng không phải bằng chứng reliable check-in end-to-end.
- Remote acceptance còn phụ thuộc S1–S2 trong Plan 02, contract compatibility và test
  concurrent/duplicate/reconciliation trên database thật.
- TTL 15 phút chỉ là cửa sổ kỹ thuật giữ retry key, không phải deadline hay policy cảnh báo.
