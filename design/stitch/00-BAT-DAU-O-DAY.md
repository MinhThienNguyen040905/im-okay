# Thiết kế I’m Okay bằng Stitch Web

Tài liệu này dành riêng cho giao diện web tại `stitch.withgoogle.com`. Không cần MCP, SDK, API key, terminal hoặc upload tài liệu qua coding agent.

## Hiểu đúng các khu vực trên Stitch Web

- **Trang Home:** nơi có danh sách project và ô prompt đầu tiên.
- **Start with your design:** nơi đưa design system và tài sản tham chiếu vào project mới.
- **Canvas/project workspace:** khu vực xuất hiện sau khi project được tạo; tại đây các screen và variants nằm cạnh nhau để tiếp tục chỉnh sửa.
- **App/Web:** chọn loại screen sắp tạo, không phải hai tài khoản hoặc hai sản phẩm khác nhau.

## Bước 1 — Mở Start with your design

Từ Home, nhấn **Start with your design**.

Trong cửa sổ hiện ra:

1. Ở **Upload a DESIGN.md file**, chọn file `DESIGN.md` trong thư mục này.
2. Không cần upload code, image, font, logo hoặc `.fig` vì dự án chưa có các tài sản đó.
3. Để trống **Public GitHub repository** vì repository `im-okay` hiện là private.
4. Để trống **Add website** vì dự án chưa có website đang chạy.
5. Ở **Additional instructions**, dán nội dung trong `02-ADDITIONAL-INSTRUCTIONS.md`.
6. Nhấn **Continue**.

Có thể paste toàn bộ nội dung `DESIGN.md` vào ô “Paste existing DESIGN.md” thay vì upload file, nhưng chỉ dùng một trong hai cách để tránh tạo hai bản design system.

## Bước 2 — Kiểm tra project sau khi Continue

Sau khi Stitch xử lý xong:

1. Đặt tên project là `I'm Okay — Product Design` nếu Stitch yêu cầu.
2. Kiểm tra design system đã nhận đúng tên `I'm Okay`.
3. Kiểm tra giao diện mẫu dùng đúng tinh thần calm, trustworthy, accessible.
4. Nếu style sai, sửa design system hoặc Additional instructions trước khi tạo nhiều screen.

Không cần đưa `03-PROJECT-BRIEF.md` và `04-UX-FLOWS.md` lên canvas. Hai file này dành cho bạn đọc và đối chiếu; nội dung cần thiết cho Stitch đã được cô đọng trong Additional instructions và từng screen prompt.

## Bước 3 — Tạo ba anchor screens

Tạo anchor trước để khóa phong cách cho toàn bộ sản phẩm.

### M06 Trang chủ

1. Chọn **App**.
2. Mở `prompts/01-anchors/M06-trang-chu.md`.
3. Copy toàn bộ nội dung và dán vào prompt box.
4. Generate screen.
5. Chưa tạo screen khác ngay.

### Tạo variants cho M06

1. Chọn screen M06 vừa tạo.
2. Dán `prompts/06-refinement/01-generate-variants.md`.
3. Chọn variant có CTA check-in rõ nhất, hierarchy dễ hiểu nhất và chịu được text dài.
4. Xóa hoặc để riêng các variant không chọn; không dùng chúng làm reference cho screen sau.
5. Nếu cần sửa, dùng `prompts/06-refinement/02-targeted-edit.md` và thay nội dung trong ngoặc vuông.

### M09 và W02

1. Chọn **App**, tạo M09 từ `prompts/01-anchors/M09-canh-bao-sap-kich-hoat.md`.
2. Chọn **Web**, tạo W02 từ `prompts/01-anchors/W02-chi-tiet-canh-bao.md`.
3. Tạo variants, chọn và targeted-edit từng anchor như M06.
4. Dùng `prompts/06-refinement/03-consistency-pass.md` để kiểm tra ba anchor có cùng design language.

Chỉ tiếp tục khi M06, M09 và W02 trông như cùng một sản phẩm.

## Bước 4 — Tạo screen theo từng flow

Không gửi toàn bộ prompt liên tiếp mà không review.

### Flow onboarding

Chọn **App**, tạo M01 → M05 từ `prompts/02-onboarding/`.

Sau mỗi screen:

1. So sánh với M06 được chọn.
2. Edit nếu hierarchy hoặc component lệch.
3. Không generate lại chỉ vì một chi tiết nhỏ.

### Flow liên hệ tin cậy

1. Chọn **App**, tạo M07 và M08 từ `prompts/03-trusted-contacts/`.
2. Chọn **Web**, tạo W01.
3. Kiểm tra W01 dùng đúng web shell và component language của W02.

### Flow cảnh báo và phản hồi

1. M09 và W02 đã có từ anchor phase.
2. Chọn **App**, tạo M10.
3. Chọn **Web**, tạo W03 → W05.

### Flow quản lý

Chọn **App**, tạo M11 và M12 từ `prompts/05-management/`.

## Bước 5 — Nối prototype và thiết kế states

Sau mỗi flow:

1. Nối các screen bằng prototype/link interactions của Stitch.
2. Dán `prompts/07-qa/02-prototype-review.md` để review flow.
3. Dán `prompts/07-qa/03-accessibility-responsive.md` để review accessibility.
4. Dùng `prompts/08-states/` để tạo loading, offline, error, expired và resolved variants.

Các state nên được tạo từ screen đã duyệt, không phải generate thành một visual direction mới.

## Bước 6 — Theo dõi tiến độ

Sau mỗi screen, cập nhật `05-SCREEN-TRACKER.md`:

- Tên screen trong Stitch.
- Variant được chọn.
- Đã nối prototype hay chưa.
- Đã screen QA và responsive QA hay chưa.
- Trạng thái sẵn sàng export.

## Bước 7 — Export

Chỉ export sau khi:

- Đủ 12 mobile screens và 5 web screens.
- Các flow không có dead end.
- Screen states quan trọng đã được thiết kế.
- Mobile đã kiểm tra ở 390 px và web ở 390/768/1440 px.
- Không có screen dùng theme hoặc navigation khác với anchors.

Dùng tùy chọn export/share đang hiển thị trong Stitch cho bản đã chọn. Không đưa các variants đã loại vào source chính.

## Quy tắc quan trọng

- `DESIGN.md` chỉ đưa vào một lần khi tạo project.
- Không lặp mã màu, font hoặc radius trong screen prompts.
- Mỗi prompt tạo đúng một main screen.
- Dùng prompt ngắn, cụ thể khi edit.
- Giữ tất cả App và Web screens của I’m Okay trong cùng project.
- Không dùng ô Public GitHub repository khi repo còn private.

## Tài liệu chính thức đối chiếu

- [DESIGN.md trong Stitch](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)
- [Canvas, DESIGN.md và interactive prototypes](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/)
- [Prototypes trong Stitch](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-gemini-3/)
