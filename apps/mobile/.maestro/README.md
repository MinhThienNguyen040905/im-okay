# MA7 mobile E2E

Maestro chạy trên binary Android/iOS có app id `com.imokay.app`; không chạy bằng Expo Go.

## Flow mặc định

`01-fixture-onboarding-check-in.yaml` dùng profile `local`, xóa app state/keychain, từ chối
notification, hoàn tất M01→M06, check-in và xác minh onboarding/session được khôi phục sau khi
restart. Fixture chỉ kiểm tra client interaction; nó không chứng minh backend scheduling hoặc
notification thật.

```powershell
Set-Location apps/mobile
eas build --profile local --platform android
maestro test .maestro
```

## Journey chưa được gọi là E2E ở local

- Offline/timeout check-in cần profile `staging` nối API thật hoặc fault proxy; fixture server nằm
  trong app nên bật airplane mode không đại diện network failure.
- SOS hold/two-step đã có Jest component regression; full SOS E2E cần ít nhất một contact được
  W01 xác nhận trên staging. Không thêm backdoor để fixture tự chuyển invitation sang accepted.
- Push denied/disabled và VoiceOver/TalkBack cần development/internal build trên thiết bị thật.

Không dùng email/contact thật trong flow. Không chạy Maestro production và không gửi SOS/drill
thật ngoài tenant/test recipient được chuẩn bị riêng.
