# QA navigation theo flow

Stitch Web không hỗ trợ nối interaction giữa các screen độc lập. Dùng tài liệu này làm navigation contract cho Expo Router/contact-web routes và làm checklist review runtime/E2E:

- Onboarding: `M01 Giới thiệu` → `M02 Đăng nhập` → `M03 Thiết lập hồ sơ` → `M04 Quyền thông báo` → `M05 Kế hoạch an toàn` → `M06 Trang chủ`.
- Thêm người liên hệ: `M06 Trang chủ` → `M07 Người liên hệ tin cậy` → `M08 Mời người liên hệ` → `W01 Chấp nhận lời mời` → quay lại `M07` với trạng thái đã chấp nhận.
- Xử lý cảnh báo: `M09 Cảnh báo đang hoạt động` → `W02 Chi tiết cảnh báo` → `W03 Xác nhận sẽ kiểm tra` → `W04 Cập nhật tình hình` → `W05 Hoàn tất`.
- SOS: `M06 Trang chủ` → `M10 Trợ giúp khẩn cấp` → giữ nút 3 giây hoặc dùng xác nhận hai bước → `SOS - Đã gửi yêu cầu trợ giúp` → `M09 Cảnh báo` hoặc `W02 Chi tiết cảnh báo` theo vai trò.
- Quản lý: bottom navigation chỉ chuyển giữa `M06 Trang chủ`, `M11 Lịch sử` và `M12 Cài đặt`. `M07–M10` là màn hình con và dùng Back/Close.

Acceptance checks:

- Mỗi CTA chính, Back/Close, retry, cancel và terminal state có đích đến xác định.
- Không có trạng thái lỗi/offline nào báo thành công giả hoặc rơi vào dead end.
- Auth expired quay lại route hợp lệ sau đăng nhập; mặc định M06.
- SOS sent cho phép về M06 hoặc xem M09 accepted-for-sending.
- Các transition được kiểm thử trên runtime; không coi preview từng screen của Stitch là bằng chứng click-through.

Kiểm tra:

1. Entry point và exit point rõ ràng.
2. Back/Close không tạo dead end hoặc mất dữ liệu ngoài dự kiến.
3. CTA dẫn đúng screen/state.
4. Success, cancel và failure có kết thúc rõ.
5. Người dùng không thể vô tình gửi SOS hoặc tắt bảo vệ.
6. Contact không thể resolve alert chỉ bằng việc mở email.
7. Alert đã resolve không còn action cũ.
8. Drill không bị hiểu là cảnh báo thật.
9. Navigation labels và wording nhất quán giữa các screen.
10. Không thiếu màn hình hoặc state trung gian.

Đầu ra gồm:

- Danh sách connection cần tạo/sửa.
- Dead ends và loops.
- Screen/state còn thiếu.
- Ba ưu tiên sửa trước khi export.
