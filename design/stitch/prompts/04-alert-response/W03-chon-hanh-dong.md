# W03 — Chọn hành động xử lý

Tạo responsive web page sau khi Lan chọn “Tôi sẽ kiểm tra” ở W02.

**PLATFORM:** Responsive web, mobile-first 390 px; centered desktop container.

**USER GOAL:** Cam kết một hành động cụ thể để các liên hệ khác biết ai đang xử lý.

**PAGE STRUCTURE:**

1. Header có Back, logo nhỏ và context “Cảnh báo của Minh Anh”.
2. Step label “Bước 1/2”.
3. Heading “Bạn sẽ kiểm tra bằng cách nào?”.
4. Explanation “Chọn một hành động. Bạn có thể cập nhật kết quả ở bước tiếp theo.”
5. Three full-card radio choices:
   - “Tôi đang gọi cho Minh Anh” — “Bắt đầu ngay bây giờ”.
   - “Tôi sẽ đến kiểm tra” — “Cho các liên hệ khác biết bạn đang trên đường”.
   - “Tôi sẽ nhờ người khác hỗ trợ” — “Chuyển alert sang liên hệ tiếp theo”.
6. Optional textarea “Ghi chú cho các liên hệ khác”, tối đa 200 ký tự.
7. Primary action “Xác nhận hành động”.
8. Secondary text action “Tôi không thể hỗ trợ”.

**INTERACTIONS:** Chỉ chọn một option; toàn bộ card là target; submit dẫn W04 hoặc chuyển tiếp khi chọn nhờ người khác.

**CONSTRAINTS:** Không lộ email/số điện thoại của Lan. Dùng design system và web component language của W02.

