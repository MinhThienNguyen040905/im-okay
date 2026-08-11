# Mobile MA7 — Device và accessibility matrix

Ngày tạo matrix: 02/08/2026.

## 1. Bằng chứng tự động trong repository

| Gate                          | Bằng chứng                                                                  | Trạng thái                       |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| Touch target/shared semantics | component styles + Button/Input/SOS tests                                   | Tự động đạt                      |
| Reduce Motion                 | stack/modal/SOS behavior + reduced-motion test                              | Tự động đạt                      |
| Dynamic font resilience       | scrollable screens/modal, wrapping button/row, không khóa settings một dòng | Static/component đạt; chờ device |
| Status không chỉ dùng màu     | badge/icon/wording contract cho warning/SOS/drill/history                   | Tự động đạt                      |
| Incoming link/token boundary  | deep-link allowlist tests                                                   | Tự động đạt                      |
| Sentry PII/token scrub        | logger + full event sanitizer tests                                         | Tự động đạt                      |
| Fixture critical smoke        | Maestro M01→M06, check-in, restart                                          | Flow đã tạo; chờ binary/device   |

## 2. Matrix phải chạy trên internal build

Không điền “Đạt” nếu chưa có tên thiết bị/OS/build ID và người kiểm tra.

| Nhóm                                      | Thiết bị/OS                | Chế độ                                                        | Ca kiểm tra                               | Kết quả       |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------- |
| Android thấp nhất được Expo SDK 57 hỗ trợ | Chốt từ prebuild/EAS image | Font 100%/200%, system dark                                   | M01→M12, keyboard, small viewport         | Chờ           |
| Android phổ biến/tầm trung vật lý         | TECNO KJ7 / Android 14     | Font 200%; TalkBack Home semantics pass; spoken/full flow chờ | Home/check-in/restart pass; full flow chờ | Partial 11/08 |
| Android hiện hành emulator                | Ghi API/device             | Airplane mode + font 200%                                     | Offline/timeout/retry và deep link        | Chờ staging   |
| iPhone màn hình nhỏ                       | Ghi model + iOS            | VoiceOver, font 200%, Reduce Motion                           | M01→M12, modal/focus/keyboard             | Chờ           |
| iPhone hiện hành vật lý                   | Ghi model + iOS            | VoiceOver, push denied/granted                                | Auth callback, check-in, SOS, restart     | Chờ           |
| iOS Simulator                             | Ghi runtime                | Light app khi system dark                                     | Layout/navigation/deep link smoke         | Chờ           |

## 3. Pass criteria

- Không clip CTA, deadline, error hay Vietnamese copy ở font 200%; scroll tới được mọi action.
- TalkBack/VoiceOver đọc heading, label, role, busy/disabled/checked và mutation announcement đúng
  thứ tự; modal focus không ở backdrop.
- External keyboard có focus order theo visual order; không có action mất focus hoặc dead end.
- Reduce Motion không slide/scale nhưng vẫn giữ feedback cần thiết cho hold SOS.
- System dark không đổi sang palette chưa được thiết kế; status/navigation bar vẫn có contrast.
- Link contact/public token không mở route private trong app; auth callback hợp lệ vẫn đăng nhập.
- Push denied/disabled không chặn onboarding và không làm app hứa reminder đã sẵn sàng.

Biên bản chạy thật cần ghi EAS build ID, commit SHA, environment, tester, timestamp, ảnh/video lỗi
và ticket liên quan. Dữ liệu/contact phải là danh tính test đã có consent.
