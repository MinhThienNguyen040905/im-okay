# State variants cho web alert links

Từ W01–W05 đã được duyệt, tạo state frames dùng cùng web shell:

1. Loading token validation.
2. Invalid link — không tiết lộ alert có tồn tại.
3. Expired link — hướng dẫn kiểm tra email mới hơn.
4. Invitation already accepted.
5. Alert already resolved by user check-in.
6. Another contact is currently handling.
7. Completed drill — gắn nhãn “Diễn tập” rõ ràng.
8. Network failure while submitting response — giữ lựa chọn và cho retry.

Không hiển thị token, provider ID, email/số điện thoại của contact khác hoặc dữ liệu nhạy cảm. Không cho action lại trên alert đã kết thúc.

