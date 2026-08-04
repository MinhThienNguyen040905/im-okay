# I’m Okay — Stitch Web screen tracker

Điền tracker sau mỗi vòng generate, chọn variant và QA. Dùng tên screen hiển thị trong Stitch Web; không cần API screen ID.

| ID  | Màn hình            | Loại         | Tên trong Stitch                   | Variant chọn                                                | Prototype                                      | Screen QA                          | A11y/Responsive                    | Trạng thái                |
| --- | ------------------- | ------------ | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- | ---------------------------------- | ------------------------- |
| M01 | Giới thiệu          | App          | Giới thiệu (Tiếng Việt) - I'm Okay | Bản MCP, đã xóa chữ trong illustration                      | Mapping khóa; Expo Router                      | Đạt qua MCP; local snapshot cũ     | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M02 | Đăng nhập           | App          | Đăng nhập - I'm Okay               | Bản MCP + session-expired state                             | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M03 | Hồ sơ               | App          | Thiết lập hồ sơ - Bước 1/3         | Bản MCP đã duyệt                                            | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M04 | Quyền thông báo     | App          | Thiết lập thông báo - Bước 2/3     | Bản MCP + denied/disabled states                            | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M05 | Kế hoạch an toàn    | App          | Thiết lập kế hoạch - Bước 3/3      | Bản MCP đã duyệt                                            | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M06 | Trang chủ           | App · Anchor | Trang chủ - I'm Okay               | Bản MCP + 5 check-in states                                 | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M07 | Liên hệ tin cậy     | App          | Liên hệ tin cậy - I'm Okay         | Bản MCP đã duyệt                                            | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M08 | Thêm liên hệ        | App          | Thêm liên hệ - I'm Okay            | Stitch hiện còn phone/SMS cũ; MA4 code/prompt là email-only | Mapping khóa cho bố cục; cần regenerate Stitch | Đạt qua MCP ở iteration cũ         | MA0 pass 200%; runtime MA7         | Chờ QA lại sau regenerate |
| M09 | Sắp kích hoạt alert | App · Anchor | Cảnh báo - I'm Okay                | Bản MCP + 5 alert states                                    | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M10 | SOS                 | App          | Trợ giúp khẩn cấp - I'm Okay       | Bản MCP + hold/two-step/sent states                         | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass; hold + two-step chốt     | Đã QA qua MCP             |
| M11 | Lịch sử             | App          | Lịch sử - I'm Okay                 | Bản MCP, đã Việt hóa                                        | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| M12 | Cài đặt             | App          | Cài đặt - I'm Okay                 | Bản MCP đã duyệt                                            | Mapping khóa; Expo Router                      | Đạt qua MCP                        | MA0 pass 200%; runtime MA7         | Đã QA qua MCP             |
| W01 | Xác nhận lời mời    | Web          | Xác nhận lời mời - I'm Okay        | Bản MCP, đã Việt hóa footer                                 | Expo Router + public API local                 | Đạt qua MCP + source test          | Automated local; browser matrix S4 | Runtime local hoàn tất    |
| W02 | Chi tiết cảnh báo   | Web · Anchor | Cảnh báo an toàn - I'm Okay        | Bản MCP, đã targeted edit                                   | Expo Router + public API local                 | Source/build test; snapshot còn mở | Automated local; browser matrix S4 | Runtime local hoàn tất    |
| W03 | Chọn hành động      | Web          | Chọn hành động xử lý - I'm Okay    | Bản MCP đã duyệt                                            | Alert route interaction local                  | Đạt + source test                  | Automated local; browser matrix S4 | Runtime local hoàn tất    |
| W04 | Theo dõi xử lý      | Web          | Theo dõi xử lý - I'm Okay          | Bản MCP, đã Việt hóa footer                                 | Alert route interaction local                  | Đạt qua MCP + source test          | Automated local; browser matrix S4 | Runtime local hoàn tất    |
| W05 | Kết quả cảnh báo    | Web          | Kết quả cảnh báo - I'm Okay        | Bản MCP, đã Việt hóa footer                                 | Alert route result state local                 | Đạt qua MCP + source test          | Automated local; browser matrix S4 | Runtime local hoàn tất    |

## Ghi chú đồng bộ Stitch

- Đã chọn đủ 17 màn hình sản phẩm: 12 App và 5 Web.
- M11 và M12 truy xuất được trực tiếp bằng screen ID, nhưng API danh sách canvas chưa trả về hai màn hình này. Đây là trạng thái đồng bộ/hiển thị, không phải mất thiết kế.
- Preview tải xuống của M01 và W02 có thể còn là snapshot trước targeted edit do cache của Stitch; thay đổi cuối đã được MCP ghi nhận.
- MA0 đã tạo 16 mobile state designs và chạy accessibility consistency pass trên M01–M12 ngày 02/08/2026. Xem `06-MA0-DESIGN-READINESS.md`.
- Navigation mapping đã chốt. Browser audit ngày 02/08/2026 và tài liệu Stitch Controls chính thức xác nhận Stitch Web không có công cụ nối cross-screen prototype; click-through sẽ được hiện thực bằng Expo Router và kiểm thử E2E.

## Trạng thái

```text
Chưa tạo → Đang khám phá → Đã chọn variant → Đang tinh chỉnh → Đã QA → Sẵn sàng export
```
