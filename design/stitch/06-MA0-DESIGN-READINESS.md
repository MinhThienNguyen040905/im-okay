# I’m Okay — MA0 design readiness handoff

## Trạng thái

MA0 được thực hiện ngày 02/08/2026 trên Stitch project `I’m Okay Safety System` (`9249994988754984867`) với design system `assets/cbd4d1ec489847ac84e45f592436c1f3`.

| Hạng mục                               | Kết quả                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| Check-in states                        | Hoàn tất                                                           |
| Push denied/disabled                   | Hoàn tất                                                           |
| Auth expired                           | Hoàn tất                                                           |
| Alert states                           | Hoàn tất                                                           |
| SOS hold/two-step/sent                 | Hoàn tất                                                           |
| M01–M12 accessibility consistency pass | Hoàn tất qua Stitch MCP                                            |
| Navigation mapping                     | Hoàn tất                                                           |
| Cross-screen prototype links           | Không được Stitch Web hỗ trợ; chuyển thành implementation contract |

MA0 đạt exit gate ở mức design readiness. Luồng click-through sẽ được hiện thực bằng Expo Router và kiểm thử E2E vì Stitch Web không cung cấp cross-screen prototype linking cho các screen độc lập.

## State designs đã tạo

Tổng cộng: 16 state designs.

### M06 Trang chủ — 5 states

1. `SUBMITTING`: CTA khóa chống double submit, progress và “Đang ghi nhận xác nhận của bạn…”.
2. `SUCCESS`: bottom sheet xác nhận backend, deadline mới và action đóng.
3. `OFFLINE_FAILURE`: không báo thành công giả; giữ deadline cũ và có “Thử lại”.
4. `LOADING`: skeleton giữ layout; CTA bị khóa tới khi có authoritative data.
5. `PUSH_DISABLED`: safety plan vẫn active, warning icon+text và action bật lại.

### M04 Quyền thông báo — 2 states

1. `PERMISSION_DENIED`: cho phép mở cài đặt hoặc tiếp tục mà không bật; nói rõ giới hạn.
2. `PERMISSION_DISABLED_LATER`: thông báo từng được bật nhưng hiện bị tắt; có “Mở cài đặt” và “Để sau”.

### M02 Đăng nhập — 1 state

1. `SESSION_EXPIRED`: yêu cầu đăng nhập lại, nói rõ safety plan trên server không tự thay đổi.

### M09 Cảnh báo — 5 states

1. `TRIGGERING`: countdown về 0, backend đang chuẩn bị notification.
2. `ACCEPTED_FOR_SENDING`: provider đã nhận gửi nhưng chưa contact nào nhận xử lý.
3. `PARTIAL_CHANNEL_FAILURE`: một kênh lỗi và hệ thống đang retry, không hiển thị log kỹ thuật.
4. `CORRECTION_PENDING`: user đã check-in sau khi alert gửi; hệ thống đang gửi đính chính.
5. `CANCELLED_BEFORE_SEND`: hủy trước external notification và quay về trang chủ.

### M10 SOS — 3 states

1. `HOLD_IN_PROGRESS`: tiến trình giữ ba giây, còn khoảng một giây và thả tay để hủy.
2. `ACCESSIBLE_TWO_STEP`: mở confirmation surface; chỉ nút “Xác nhận gửi” ở bước hai mới gửi.
3. `SOS_ACCEPTED_FOR_SENDING`: screen ID `cd6ac89b2b7f41a08bc8cbbb11a29161`, nói rõ đã gửi tới Lan/Tuấn/Mẹ nhưng chưa ai nhận xử lý.

## Accessibility consistency pass

Stitch MCP đã chạy targeted edit trên M01–M12 và xác nhận:

- Touch target ít nhất 48×48.
- Fixed-height container quan trọng được chuyển sang min-height/flexible padding khi cần.
- Text/layout hỗ trợ scaling tới 200% mà không clip/overlap CTA quan trọng.
- Safe-area insets cho header, bottom navigation và primary action.
- Countdown/status có nhãn văn bản và screen-reader context.
- Trạng thái dùng icon + wording + color.
- Form label/error association và vùng bấm đủ lớn.

Đây là design-level pass. Runtime QA bằng VoiceOver/TalkBack, dynamic font và device thật vẫn thuộc MA7.

## Navigation contract để triển khai trong app

### Onboarding

| Từ                  | Interaction              | Đến                           |
| ------------------- | ------------------------ | ----------------------------- |
| M01                 | Bắt đầu/Tiếp tục         | M02                           |
| M02                 | Đăng nhập thành công     | M03                           |
| M02 session expired | Đăng nhập lại thành công | Route cũ hợp lệ, mặc định M06 |
| M03                 | Tiếp tục                 | M04                           |
| M04                 | Bật thông báo/thành công | M05                           |
| M04 denied          | Tiếp tục mà không bật    | M05                           |
| M05                 | Hoàn tất                 | M06                           |

### Check-in

| Từ                | Interaction       | Đến                                       |
| ----------------- | ----------------- | ----------------------------------------- |
| M06               | Tôi vẫn ổn        | M06 submitting                            |
| M06 submitting    | Backend success   | M06 success                               |
| M06 submitting    | Offline/error     | M06 offline failure                       |
| M06 success       | Đóng              | M06 updated                               |
| M06 offline       | Thử lại           | M06 submitting                            |
| M06 push disabled | Bật lại thông báo | M04 disabled-later/system settings intent |

### Contacts

| Từ  | Interaction            | Đến                                       |
| --- | ---------------------- | ----------------------------------------- |
| M06 | Liên hệ tin cậy        | M07                                       |
| M07 | Thêm liên hệ           | M08                                       |
| M08 | Gửi lời mời thành công | M07 pending                               |
| W01 | Chấp nhận              | M07 confirmed state trong app sau refresh |

### Alert và SOS

| Từ                | Interaction             | Đến                                |
| ----------------- | ----------------------- | ---------------------------------- |
| M09 warning       | Tôi vẫn ổn              | M06 success/updated                |
| M09 warning       | Tạm hoãn                | Snooze sheet hữu hạn → M06 snoozed |
| M09 warning       | Countdown về 0          | M09 triggering                     |
| M09 triggering    | Provider accepted       | M09 accepted-for-sending           |
| M09 triggering    | Partial failure         | M09 retry                          |
| M09 active        | User check-in           | M09 correction pending → M06       |
| M09 warning       | Hủy trước external send | M09 cancelled → M06                |
| M06               | Cần trợ giúp ngay       | M10                                |
| M10               | Giữ SOS                 | M10 hold-progress                  |
| M10               | Thả trước 3 giây        | M10 base                           |
| M10               | Xác nhận hai bước       | M10 two-step                       |
| M10 hold/two-step | Backend accepted        | SOS sent state                     |
| SOS sent          | Về trang chủ            | M06                                |
| SOS sent          | Xem trạng thái cảnh báo | M09 accepted-for-sending           |

### Bottom navigation và child screens

- Bottom tabs: M06 Trang chủ, M11 Lịch sử, M12 Cài đặt.
- M07–M10 là child screens; Back/Close quay về entry screen hợp lệ.
- Không đặt M07 trong bottom navigation.

## Giới hạn Stitch và cách xử lý

Ngày 02/08/2026, project đã được kiểm tra trực tiếp bằng Chrome Browser đã kết nối. Các menu của screen chỉ cung cấp Edit, Annotate, preview theo thiết bị, View Code, export và download. Tài liệu chính thức `https://stitch.withgoogle.com/docs/learn/controls/` cũng chỉ mô tả chọn, di chuyển, điều hướng thứ tự, chỉnh sửa và xuất screen; không có công cụ tạo interaction/link giữa các screen độc lập. Stitch MCP cũng không có prototype-link API.

Vì vậy MA0 được đóng bằng navigation contract ở trên thay vì một artifact mà Stitch không hỗ trợ:

1. MA1 tạo route groups và bottom tabs theo contract.
2. MA2–MA6 hiện thực từng transition cùng loading/error/cancel/terminal state.
3. Checklist `prompts/07-qa/02-prototype-review.md` được dùng làm navigation/E2E review, không phải prompt nối canvas.
4. MA7 xác minh Back/Close, failure, cancel và terminal states không có dead end trên runtime thật.

Local HTML/PNG sau accessibility pass chưa tải lại được do sandbox chặn kết nối tới download URL. `get_screen` đã xác nhận M01–M12 vẫn truy xuất được sau edit; không coi artifact local cũ là bằng chứng cho pass mới.
