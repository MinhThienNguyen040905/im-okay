# State variants cho M09 và M10

Từ M09/M10 đã được duyệt, tạo các state nhất quán:

1. Countdown warning.
2. Countdown reached zero, “Đang gửi cảnh báo”.
3. Email/push accepted for sending.
4. Một kênh gửi thất bại; hệ thống đang retry.
5. User self-checks-in sau khi alert đã gửi; chuẩn bị gửi đính chính.
6. SOS hold progress 0–100%.
7. SOS sent to three contacts.
8. Alert cancelled before external notification.

Mỗi state phải mô tả điều đã xảy ra, điều hệ thống đang làm và action còn khả dụng. Không coi provider “sent” là contact đã đọc hoặc đang xử lý.

