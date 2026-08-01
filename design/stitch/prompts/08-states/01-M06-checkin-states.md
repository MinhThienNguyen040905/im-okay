# State variants cho M06 Trang chủ

Từ screen M06 đã được duyệt, tạo state variants dùng cùng layout và component:

1. **Submitting:** Check-in đang gửi; CTA có progress và bị khóa tránh double submit.
2. **Success:** Check-in đã được backend xác nhận; hiển thị bottom sheet, deadline mới và action đóng.
3. **Offline failure:** Không giả vờ thành công; giải thích chưa ghi nhận, có “Thử lại” và giữ dữ liệu.
4. **Push disabled:** Safety plan vẫn active nhưng có configuration warning và action “Bật lại”.
5. **Approaching deadline:** Thời gian còn dưới bốn giờ; tăng urgency nhưng chưa dùng SOS language.

Giữ nguyên navigation, content hierarchy và design system. Tạo component/state frames, không tạo năm visual themes khác nhau.

