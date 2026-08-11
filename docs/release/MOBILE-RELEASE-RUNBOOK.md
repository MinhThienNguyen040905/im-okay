# Mobile release runbook

Runbook này chuẩn bị MA7 nhưng không cấp quyền tự động build, submit hoặc rollout production.

## 1. Profile và dữ liệu

| Profile      | Distribution                | Data mode | Mục đích                                       |
| ------------ | --------------------------- | --------- | ---------------------------------------------- |
| `local`      | Internal; APK/iOS Simulator | `fixture` | UI, Maestro smoke, không có bảo vệ thật        |
| `staging`    | Internal                    | `remote`  | Device QA, remote E2E với test tenant/provider |
| `production` | Store                       | `remote`  | TestFlight/Play testing rồi staged production  |

Staging/production phải cấu hình trong EAS Environment, không trong Git:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`, `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` với visibility sensitive/secret và scope tối thiểu cho release/source map

Mọi `EXPO_PUBLIC_*` nằm trong app bundle, không được chứa service-role key, App Password hoặc
signing secret. Chạy `eas init` bằng đúng Expo account để tạo EAS project ID trước push test.

## 2. Signing và store credential

- Dùng EAS managed credentials hoặc store-managed credential workflow được owner phê duyệt.
- Apple certificate/profile, App Store Connect key, Android upload key và Play service account
  chỉ nằm trong EAS/Apple/Google secret store.
- Không copy `.jks`, `.p8`, `.p12`, `.mobileprovision`, password hoặc JSON service account vào
  workspace, CI log hay ticket.
- Production build dùng `requireCommit`; ghi commit SHA/build ID vào biên bản.

## 3. Preflight bắt buộc

Từ repository root:

```powershell
corepack pnpm format:check
corepack pnpm --filter @im-okay/mobile lint
corepack pnpm --filter @im-okay/mobile typecheck
corepack pnpm --filter @im-okay/mobile test
corepack pnpm --filter @im-okay/mobile build
```

Từ `apps/mobile` chạy thêm `expo install --check`, `expo-doctor` và kiểm tra `eas config` cho đúng
profile/environment. Dừng nếu fixture xuất hiện ở staging/production hoặc config thiếu remote URL.

## 4. Internal build và kiểm thử

```powershell
Set-Location apps/mobile
eas build --profile local --platform android
eas build --profile staging --platform all
maestro test .maestro
```

- `local` chỉ chứng minh client smoke.
- `staging` chạy matrix ở `docs/qa/MOBILE-MA7-MATRIX.md`, remote onboarding/check-in/offline/SOS,
  invitation/alert/correction và push trên thiết bị thật.
- Test deep link auth hợp lệ và các link bị từ chối bằng `uri-scheme`; không dán token thật vào
  command history, screenshot hoặc log.
- Sentry source map phải tự upload trong EAS build khi secret/org/project hợp lệ. Tạo lỗi test chỉ
  ở staging, xác minh stack đã symbolicate và event không chứa URL, email, token hay auth header.

## 5. TestFlight và Google Play Internal Testing

Chỉ submit khi Supabase backend/staging gates, privacy/support material và store artwork đã sẵn sàng.

```powershell
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Sau upload, chưa chuyển production ngay:

- Ghi App Store/Play build number, EAS build ID và commit SHA.
- Internal testers dùng contact test đã được thông báo; không dùng người thân thật ngoài consent.
- Theo dõi crash, check-in failure, cron/scheduler lag, queue/delivery, false alert/correction và
  copy confusion.
- Block release nếu có check-in false success, duplicate/mất alert, token/PII leak, SOS accidental
  send, drill mislabeled hoặc critical screen-reader failure.

## 6. Staged rollout và rollback

- Bắt đầu nhóm nhỏ do release owner phê duyệt; tăng từng bước chỉ sau một cửa sổ quan sát có dữ
  liệu. Không cố định phần trăm/thời gian trước khi có baseline staging/beta.
- Mỗi bước có người quyết định go/hold/rollback, dashboard và incident contact đang hoạt động.
- Hold rollout khi SLO/known-risk gate bị vi phạm. Với lỗi client, pause rollout và phát hành
  binary known-good/new fix theo khả năng store; không hứa downgrade tức thì cho thiết bị đã cài.
- Kill switch cho alert/provider phải do Supabase backend config có audit sở hữu; không dùng local flag để
  giả success. Nếu kill switch/reconciliation/monitoring chưa có, production vẫn bị block.
- Không rollback migration phá dữ liệu. Database/functions/contact-web/mobile phải giữ
  compatibility theo expand-contract, [`Plan 02`](../plans/02-SUPABASE-MVP.md) và
  [`Plan 03`](../plans/03-RELEASE.md).

## 7. Trạng thái hiện tại

Repository đã có EAS profiles, light/reduced-motion/deep-link/Sentry hardening, automated tests và
Maestro fixture smoke. EAS project đã liên kết; signed Android internal APK đã build, cài và smoke
trên TECNO KJ7/Android 14 với Supabase staging. Authenticated session restore và provider acceptance
push/email với sender/recipient/device đã consent đã pass; delivery được tắt lại sau smoke. Candidate
Android `3768ba65-ac54-47ad-b8d2-d23928d0cf15` từ exact commit
`f1236d5cb78979ce49e9cfb55c888ee54ca4fca2` chứa token-rotation fix đã `FINISHED`, cài trên
TECNO KJ7 và pass session restore, check-in, History, Settings registration cùng crash-log smoke.
Aggregate staging giữ một Expo token enabled, không có native token enabled; native row cũ vẫn
disabled. Full device/accessibility matrix, Sentry source-map upload, iOS build, Maestro trên
candidate binary, TestFlight/Play upload và rollout vẫn chưa hoàn tất.
