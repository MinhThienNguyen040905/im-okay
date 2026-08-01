# M10 — SOS

Tạo màn hình xác nhận gửi SOS ngay đến các liên hệ.

**PLATFORM:** Mobile, 390 × 844 px.

**USER GOAL:** Hiểu ai sẽ được báo và chủ động giữ nút để gửi, không thể gửi nhầm bằng một tap.

**PAGE STRUCTURE:**

1. App bar có Close và title “Trợ giúp khẩn cấp”.
2. Status icon và heading “Bạn cần người thân kiểm tra ngay?”.
3. Explanation “I’m Okay sẽ gửi cảnh báo ngay đến Lan, Tuấn và Mẹ mà không chờ thời hạn điểm danh.”
4. Summary:
   - “3 liên hệ sẽ được thông báo”.
   - “Kênh: Push và email”.
   - “Vị trí không được chia sẻ trong phiên bản này”.
5. Main hold control “Giữ 3 giây để gửi SOS” với progress feedback.
6. Instruction “Thả tay để hủy”.
7. Secondary action “Tôi không cần trợ giúp”.
8. Disclaimer “I’m Okay không tự động liên hệ dịch vụ cứu hộ.”

**INTERACTIONS:** Hold đủ ba giây → sending → sent confirmation. Cung cấp accessible two-step alternative cho người không thể press-and-hold.

**CONSTRAINTS:** Không flashing, continuous vibration hoặc một-tap send. Dùng alert language của M09 nhưng phân biệt rõ SOS đã chủ động kích hoạt.

