# Hướng dẫn thiết kế I’m Okay bằng Google Stitch

Đây là quy trình chuẩn để thiết kế I’m Okay trong một project Stitch duy nhất. Không gửi toàn bộ prompt liên tiếp mà không review.

## Nguyên tắc vận hành

1. Dùng `DESIGN.md` làm nguồn sự thật cho màu sắc, typography, spacing, shape và component.
2. Dùng prompt tạo màn hình chỉ để mô tả mục tiêu, platform, nội dung, cấu trúc, tương tác và trạng thái.
3. Khóa hướng thiết kế bằng ba màn hình neo trước khi tạo phần còn lại.
4. Tạo variants để khám phá; dùng edit prompt để tinh chỉnh màn hình đã chọn.
5. Không generate lại từ đầu nếu chỉ có một vài chi tiết chưa đúng.
6. Thiết kế theo user flow, nối prototype và review ngay sau mỗi flow.
7. Ghi screen ID, variant đã chọn và trạng thái QA vào `03-SCREEN-TRACKER.md`.

## Giai đoạn 0 — Chuẩn bị project

1. Tạo một project Stitch tên `I'm Okay — Product Design`.
2. Đưa `01-PROJECT-BRIEF.md` và `02-UX-FLOWS.md` lên canvas làm ngữ cảnh sản phẩm.
3. Import `DESIGN.md` thành design system của project.
4. Kiểm tra Stitch đã nhận đúng tên design system, màu chính, font, roundness và component.
5. Không chèn lại mã màu hoặc font vào prompt tạo màn hình sau bước này.

Nếu Stitch chưa nhận `DESIGN.md`, dừng tạo màn hình và sửa design system trước.

## Giai đoạn 1 — Khóa hướng bằng màn hình neo

Gửi lần lượt:

1. `prompts/01-anchors/M06-trang-chu.md`
2. `prompts/01-anchors/M09-canh-bao-sap-kich-hoat.md`
3. `prompts/01-anchors/W02-chi-tiet-canh-bao.md`

Với mỗi màn hình:

1. Generate bản đầu bằng prompt màn hình.
2. Dùng `prompts/06-refinement/01-generate-variants.md` để tạo ba layout variants ở mức `EXPLORE`.
3. Chọn một variant dựa trên hierarchy, khả năng đọc và độ rõ CTA; không chọn chỉ vì “đẹp”.
4. Dùng `prompts/06-refinement/02-targeted-edit.md` cho từng nhóm chỉnh sửa nhỏ.
5. Dùng `prompts/07-qa/01-screen-review.md` để review.
6. Ghi kết quả vào screen tracker.

Chỉ tiếp tục khi ba màn hình neo trông như cùng một sản phẩm.

## Giai đoạn 2 — Tạo các flow

### Flow A — Onboarding

Gửi các file trong `prompts/02-onboarding/` theo thứ tự M01 → M05. Sau đó nối prototype và chạy flow QA.

### Flow B — Liên hệ tin cậy

Gửi các file trong `prompts/03-trusted-contacts/` theo thứ tự M07 → M08 → W01. M01–M08 là mobile; W01 là responsive web.

### Flow C — Cảnh báo và phản hồi

M09 và W02 đã được tạo ở giai đoạn anchor. Tiếp tục M10, W03, W04, W05 trong `prompts/04-alert-response/`.

### Flow D — Quản lý

Gửi M11 và M12 trong `prompts/05-management/`.

Sau mỗi flow:

1. Review từng màn hình.
2. Chỉnh có mục tiêu; không paste lại prompt ban đầu.
3. Nối prototype bằng `prompts/07-qa/02-prototype-review.md`.
4. Kiểm tra responsive và accessibility bằng `prompts/07-qa/03-accessibility-responsive.md`.

## Giai đoạn 3 — Thiết kế trạng thái

Các màn hình chính không đủ để code production. Sau khi layout đã ổn định, dùng prompt trong `prompts/08-states/` để tạo component variants hoặc state frames cho:

- Loading, offline và lỗi check-in.
- Alert đang gửi, đã gửi và đã hủy.
- Web link hết hạn, không hợp lệ, đã được xử lý hoặc diễn tập.

Không tạo lại toàn bộ visual direction khi thêm state.

## Cấu trúc một vòng lặp tốt

```text
Generate một màn hình
        ↓
Tạo ba layout variants
        ↓
Chọn một variant
        ↓
Edit từng vấn đề cụ thể
        ↓
Review screen
        ↓
Nối với flow
        ↓
Review prototype và accessibility
```

## Quy tắc viết edit prompt

Mỗi edit prompt chỉ nên có một mục tiêu chính:

```text
Trong hero card của màn hình M06:
- Làm thời gian còn lại nổi bật hơn.
- Giảm độ nổi bật của metadata.
- Giữ nguyên nội dung, design system và các phần khác.
```

Không dùng:

```text
Hãy làm đẹp hơn, hiện đại hơn và sửa mọi thứ.
```

## Khi nào generate lại?

Chỉ generate lại từ đầu khi:

- Chọn sai platform hoặc device type.
- Bố cục nền tảng không phục vụ đúng user goal.
- Màn hình thiếu phần lớn thông tin quan trọng.
- Screen không thể cứu bằng các edit có phạm vi nhỏ.

Nếu spacing, wording, icon, thứ bậc hoặc một component chưa đúng, hãy edit màn hình hiện tại.

## Bàn giao sau Stitch

Trước khi export Figma/HTML/code:

1. Hoàn thành tracker cho 17 màn hình.
2. Prototype được toàn bộ bốn flow chính.
3. Không còn màn hình dùng theme hoặc navigation khác biệt.
4. Review mobile 390 px và web 390/768/1440 px.
5. Review tiếng Việt, font scaling, contrast, touch target và keyboard focus.
6. Export screenshot của bản được chọn; không export các variant bị loại vào source chính.

