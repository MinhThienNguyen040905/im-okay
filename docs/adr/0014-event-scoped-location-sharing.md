# ADR 0014 — Chia sẻ vị trí theo sự kiện có thời hạn

- Trạng thái: Accepted
- Ngày: 2026-08-23
- Phạm vi: mobile SOS/check-in, Supabase alert/RPC/RLS và contact web

## Bối cảnh

I’m Okay đã có luồng check-in, SOS và public alert token, nhưng chưa chia sẻ vị trí. Theo dõi vị trí liên tục không thuộc MVP và làm tăng rủi ro riêng tư, hao pin, yêu cầu quyền nền cũng như gánh nặng release.

## Quyết định

- Chỉ thu thập vị trí khi app đang mở, sau một hành động tự nguyện: SOS hoặc bật tùy chọn cho chính lần check-in đó. Mặc định luôn tắt.
- Không yêu cầu `ACCESS_BACKGROUND_LOCATION`, không chạy foreground location service và không lưu lịch sử đường đi.
- Nếu người dùng từ chối quyền, GPS không trả kết quả hoặc quá thời gian chờ, SOS/check-in vẫn gọi server bình thường nhưng không có vị trí.
- SOS lưu một vị trí hiện tại tối đa 24 giờ. Vị trí lúc check-in được gắn với deadline alert của chu kỳ vừa tạo và hết hạn 24 giờ sau deadline.
- `location_shares` bị force RLS và không cấp quyền đọc/ghi trực tiếp cho client. Edge API chỉ gọi RPC service-role; mọi tọa độ đều được validate ở Edge và PostgreSQL.
- Raw tọa độ không đi vào audit metadata, notification payload, email, analytics hoặc log. Audit chỉ ghi nguồn, sai số và expiry.
- Public alert projection chỉ trả vị trí khi alert token còn active, thuộc contact nhận alert và vị trí chưa hết hạn. Khi alert kết thúc, projection không trả dữ liệu này nữa.
- Contact web không hiển thị tọa độ; chỉ hiện thời điểm/sai số và nút chủ động mở bản đồ bên thứ ba.
- Idempotency key của SOS/check-in được giữ cùng payload vị trí trên mobile. Server serialize cùng key và từ chối retry có/không có vị trí không nhất quán.

## Hệ quả

- Người dùng có một cách chia sẻ thông tin hữu ích khi cần mà không biến sản phẩm thành công cụ giám sát.
- Vị trí từ thiết bị có thể cũ hoặc sai; UI luôn hiển thị thời điểm và độ chính xác, không cam kết khả năng cứu hộ.
- Build native mới là bắt buộc vì thêm `expo-location`; Expo Go không là bằng chứng cho behavior production.
- Trước store rollout phải cập nhật privacy policy, Play Data safety và thực hiện review quyền vị trí/consent trên Android và iOS.
