# QA prototype theo flow

Trong Stitch Web, nối các screen đã chọn theo những flow sau, sau đó review prototype end-to-end:

- Onboarding: `M01 Chào mừng` → `M02 Đăng nhập` → `M03 Thông tin cơ bản` → `M04 Thiết lập check-in` → `M05 Quyền thông báo` → `M06 Trang chủ`.
- Thêm người liên hệ: `M06 Trang chủ` → `M07 Người liên hệ tin cậy` → `M08 Mời người liên hệ` → `W01 Chấp nhận lời mời` → quay lại `M07` với trạng thái đã chấp nhận.
- Xử lý cảnh báo: `M09 Cảnh báo đang hoạt động` → `W02 Chi tiết cảnh báo` → `W03 Xác nhận sẽ kiểm tra` → `W04 Cập nhật tình hình` → `W05 Hoàn tất`.
- SOS: `M06 Trang chủ` → giữ nút SOS 3 giây → `M10 SOS đã gửi` → `W02 Chi tiết cảnh báo` → tiếp tục flow xử lý cảnh báo.
- Quản lý: dùng bottom navigation để chuyển giữa `M06 Trang chủ`, `M07 Người liên hệ tin cậy`, `M11 Lịch sử` và `M12 Cài đặt`.

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
