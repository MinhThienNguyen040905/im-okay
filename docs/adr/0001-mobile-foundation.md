# ADR 0001 — Nền tảng mobile MA1

- Trạng thái: Accepted
- Ngày: 2026-08-02
- Phạm vi: `apps/mobile`

> Cập nhật 2026-08-04: các tham chiếu backend/workspace cũ được thay thế bởi kiến trúc
> Supabase-first trong ADR 0008. Quyết định và bằng chứng mobile trong ADR này không đổi.

## Bối cảnh

MA1 cần một nền tảng Expo chạy được trên iOS/Android, có typed routes, component dùng lại,
kiểm thử và observability nhưng chưa phụ thuộc API, Supabase hoặc provider thông báo.
Workspace full-stack/S1 chưa được triển khai đầy đủ.

## Quyết định

- Dùng Expo SDK 57, React Native 0.86, React 19 và Expo Router với `src/app`.
- Dùng TypeScript strict và bật `noUncheckedIndexedAccess`, `noImplicitOverride`.
- Tạo workspace pnpm/Turborepo tối thiểu chỉ để sở hữu `apps/mobile`; không coi
  S1 full-stack đã hoàn tất.
- Dùng system font gần Inter ở runtime MA1, đúng hướng dẫn trong `DESIGN.md`.
- Dùng Jest + React Native Testing Library; test không nằm trong thư mục route.
- Sentry chỉ bật khi có `EXPO_PUBLIC_SENTRY_DSN`; mặc định không gửi PII.
- Tất cả biến `EXPO_PUBLIC_*` được coi là dữ liệu public đã nằm trong app bundle.
- Root route tạm chuyển vào main tabs; MA2 sẽ thay bằng session/onboarding restoration.

## Hệ quả

- Có thể chạy và kiểm thử navigation shell mà chưa cần backend hay secret.
- `apps/contact-web`, `supabase/`, CI và shared config vẫn thuộc S1, chưa hoàn tất.
- Source map upload và release tagging cho Sentry thuộc MA7/Plan 03.
- Bundle identifier/package name đang là giá trị kỹ thuật dự kiến và phải được xác nhận trước release store.
