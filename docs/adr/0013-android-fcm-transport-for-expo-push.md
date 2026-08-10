# ADR 0013 — FCM transport Android cho Expo Push

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Phạm vi: Android mobile build, Expo Push credential, EAS staging/production
- Làm rõ một phần ADR 0008 và ADR 0010

## Bối cảnh

I’m Okay đã chọn Expo Push cho reminder channel. Android internal build có notification
permission nhưng không lấy được Expo push token; hosted `user_devices` vẫn bằng `0`.
Audit build cho thấy chưa có Firebase Android app config và FCM V1 credential.

ADR 0008 cấm thêm Firebase như một backend song song vì điều đó sẽ nhân đôi Auth,
data model, function, observability và deploy. Tuy nhiên Expo Push trên Android vẫn cần FCM là
transport của hệ điều hành. Cần phân biệt transport credential này với việc chọn
Firebase làm application backend.

## Quyết định

- Tạo một Firebase project chỉ để cấp FCM transport cho Android app package
  `com.imokay.app`.
- Không dùng Firebase Auth, Firestore, Realtime Database, Cloud Functions, Storage,
  Analytics, Crashlytics hoặc Remote Config. Supabase vẫn là application backend và source of
  truth duy nhất.
- `google-services.json` không commit vào Git. EAS preview/production nhận file qua file-type
  environment variable `GOOGLE_SERVICES_JSON`; dynamic Expo config ánh xạ nó sang
  `android.googleServicesFile`.
- FCM V1 service-account JSON chỉ nạp vào EAS Android push credential store. Không đặt
  private key trong `EXPO_PUBLIC_*`, EAS string variable, Supabase secret, log hoặc artifact.
- Cấu hình và smoke staging trước. Chỉ gửi push tới thiết bị test đã consent, ghi
  Expo ticket/receipt đã scrub và tắt lại notification delivery sau cửa sổ smoke.
- Việc credential tồn tại hoặc provider trả ticket không tự đóng gate. Gate chỉ xanh khi
  build mới đăng ký token, backend lưu device, ticket/receipt được đối chiếu và invalid-token
  lifecycle vẫn đúng.

## Hệ quả

- Android có thêm một external transport dependency và hai credential surface do EAS/Firebase
  quản lý, nhưng không có Firebase domain state hay client data API.
- Credential cần owner, rotation/revocation procedure và staging/production separation trước
  internal release.
- Nếu Expo/FCM outage xảy ra, authoritative deadline/alert vẫn ở Supabase; push chỉ là reminder
  channel và không được coi là bằng chứng contact đã nhận xử lý.

## Tài liệu nền tảng

- [Expo — FCM credentials for Android](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Expo — EAS environment file variables](https://docs.expo.dev/eas/environment-variables/faq/)
