# I’m Okay — Stitch Web screen tracker

Điền tracker sau mỗi vòng generate, chọn variant và QA. Dùng tên screen hiển thị trong Stitch Web; không cần API screen ID.

| ID | Màn hình | Loại | Tên trong Stitch | Variant chọn | Prototype | Screen QA | A11y/Responsive | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| M01 | Giới thiệu | App | Giới thiệu (Tiếng Việt) - I'm Okay | Bản MCP, đã xóa chữ trong illustration | Chưa nối | Đạt; chờ snapshot mới | Cần test font scaling | Đang tinh chỉnh |
| M02 | Đăng nhập | App | Đăng nhập - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M03 | Hồ sơ | App | Thiết lập hồ sơ - Bước 1/3 | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M04 | Quyền thông báo | App | Thiết lập thông báo - Bước 2/3 | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M05 | Kế hoạch an toàn | App | Thiết lập kế hoạch - Bước 3/3 | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M06 | Trang chủ | App · Anchor | Trang chủ - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M07 | Liên hệ tin cậy | App | Liên hệ tin cậy - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M08 | Thêm liên hệ | App | Thêm liên hệ - I'm Okay | Bản MCP, đã bỏ phone/SMS | Chưa nối | Đạt qua MCP | Cần test font scaling | Đã QA |
| M09 | Sắp kích hoạt alert | App · Anchor | Cảnh báo - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test font scaling | Đã QA |
| M10 | SOS | App | Trợ giúp khẩn cấp - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test thao tác giữ | Đã QA |
| M11 | Lịch sử | App | Lịch sử - I'm Okay | Bản MCP, đã Việt hóa | Chưa nối | Đạt qua MCP | Cần test font scaling | Đã QA |
| M12 | Cài đặt | App | Cài đặt - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần test cuộn/font scaling | Đã QA |
| W01 | Xác nhận lời mời | Web | Xác nhận lời mời - I'm Okay | Bản MCP, đã Việt hóa footer | Chưa nối | Đạt qua MCP | Cần QA 390/768/1440 | Đã QA |
| W02 | Chi tiết cảnh báo | Web · Anchor | Cảnh báo an toàn - I'm Okay | Bản MCP, đã targeted edit | Chưa nối | Chờ snapshot mới | Cần QA 390/768/1440 | Đang tinh chỉnh |
| W03 | Chọn hành động | Web | Chọn hành động xử lý - I'm Okay | Bản MCP đã duyệt | Chưa nối | Đạt | Cần QA 390/768/1440 | Đã QA |
| W04 | Theo dõi xử lý | Web | Theo dõi xử lý - I'm Okay | Bản MCP, đã Việt hóa footer | Chưa nối | Đạt qua MCP | Cần QA 390/768/1440 | Đã QA |
| W05 | Kết quả cảnh báo | Web | Kết quả cảnh báo - I'm Okay | Bản MCP, đã Việt hóa footer | Chưa nối | Đạt qua MCP | Cần QA 390/768/1440 | Đã QA |

## Ghi chú đồng bộ Stitch

- Đã chọn đủ 17 màn hình sản phẩm: 12 App và 5 Web.
- M11 và M12 truy xuất được trực tiếp bằng screen ID, nhưng API danh sách canvas chưa trả về hai màn hình này. Đây là trạng thái đồng bộ/hiển thị, không phải mất thiết kế.
- Preview tải xuống của M01 và W02 có thể còn là snapshot trước targeted edit do cache của Stitch; thay đổi cuối đã được MCP ghi nhận.

## Trạng thái

```text
Chưa tạo → Đang khám phá → Đã chọn variant → Đang tinh chỉnh → Đã QA → Sẵn sàng export
```
