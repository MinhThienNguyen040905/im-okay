# QA accessibility và responsive

Review các screen được chọn theo accessibility và responsive behavior. Không thay đổi visual direction.

## Mobile

- Reference 390 × 844 px và thiết bị nhỏ hơn 360 px.
- Touch target tối thiểu 48 × 48 px.
- Safe area, keyboard và bottom navigation không che CTA.
- Text scale 200% không bị cắt hoặc overlap.
- Press-and-hold SOS có accessible alternative.

## Web

- Kiểm tra 390, 768 và 1440 px.
- Content không kéo giãn thành dashboard rộng.
- Keyboard focus order và visible focus state rõ.
- Link/button semantics đúng.

## Tất cả platform

- WCAG AA contrast.
- Không truyền trạng thái chỉ bằng màu.
- Icon mơ hồ có text label hoặc accessible name.
- Error liên kết với đúng field.
- Countdown có equivalent text dễ đọc bởi screen reader.
- Motion không flashing và có thể giảm.

Trả về findings theo Blocker/Major/Minor và targeted fixes. Không thêm theme mới.

