# I’m Okay — Mobile app status and remaining gates

## 1. Vai trò của plan

Plan này chỉ theo dõi mobile Expo cho người được bảo vệ. Toàn bộ client M01–M12
đã được triển khai; công việc còn lại là nối Supabase backend thật, kiểm thử
trên staging/thiết bị và phát hành internal build.

Chi tiết quyết định và bằng chứng đã hoàn thành nằm trong ADR 0001–0007. Bản
plan cũ có 57 checkbox hoàn thành được rút gọn tại đây; việc rút gọn không
thay đổi trạng thái hay nghiệm thu đã ghi nhận.

Ngoài phạm vi mobile: authoritative deadline/state transition, email/push thật,
escalation, public contact response và account-data processing. Các phần này thuộc
[`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md).

## 2. Trạng thái M01–M12

| Hạng mục | Trạng thái client | Nghiệm thu còn lại | Bằng chứng |
| --- | --- | --- | --- |
| MA0 design/navigation | Hoàn tất | Không | `design/stitch/06-MA0-DESIGN-READINESS.md` |
| MA1 foundation | Hoàn tất | Không | `docs/adr/0001-mobile-foundation.md` |
| MA2 auth/onboarding M01–M05 | Hoàn tất | Supabase auth, device token và remote API | `docs/adr/0002-mobile-auth-onboarding.md` |
| MA3 check-in M06 | Hoàn tất | Transaction/concurrency/scheduler thật | `docs/adr/0003-mobile-authoritative-check-in.md` |
| MA4 trusted contacts M07/M08 | Hoàn tất | Invitation W01 và email thật | `docs/adr/0004-mobile-authoritative-trusted-contacts.md` |
| MA5 warning/SOS/snooze/drill M09/M10 | Hoàn tất | Alert/provider E2E trên staging | `docs/adr/0005-mobile-authoritative-alert-actions.md` |
| MA6 history/settings M11/M12 | Hoàn tất | Remote projection, retention và re-auth | `docs/adr/0006-mobile-history-settings-safe-projections.md` |
| MA7 repository hardening | Hoàn tất | Device/accessibility/build/store gate | `docs/adr/0007-mobile-release-hardening.md` |

## 3. Contract client phải giữ

- Supabase Auth sở hữu session; mobile không nhận service-role key.
- Server state dùng TanStack Query; mutation deadline/plan/alert không optimistic.
- Remote mode không tính deadline. Countdown chỉ dùng `serverTime` và authoritative
  `nextDeadlineAt`.
- Check-in, snooze, SOS, drill, disable/export/delete dùng persisted `Idempotency-Key` theo
  scope; retry outcome không chắc chắn phải dùng lại key.
- Trusted-contact status và alert/correction state chỉ đến từ backend projection.
- Offline/timeout không được hiển thị check-in/SOS thành công giả.
- SOS cần hold ba giây hoặc accessible two-step; drill có source/copy riêng.
- Public invitation/alert token thuộc contact web, không đi vào mobile route.
- `EXPO_PUBLIC_DATA_MODE=fixture` chỉ dùng local và luôn hiển thị chưa có bảo vệ thật.

HTTP route, projection, error code và idempotency contract hiện có được giữ khi nối
Supabase Edge Function router. Nếu backend contract cần thay đổi, cập nhật adapter,
Zod schema, test và ADR trong cùng thay đổi.

## 4. Gate còn mở

### Remote integration

- [ ] Xác minh email/Google auth, redirect và session restore với Supabase staging.
- [ ] Xác minh profile/device/safety-plan onboarding qua Edge Functions.
- [ ] Chạy check-in duplicate/concurrent/offline/timeout với PostgreSQL và scheduler thật.
- [ ] Chạy invitation accept/decline/revoke/concurrent-submit qua contact web.
- [ ] Chạy accelerated warning/alert/escalation/correction/SOS/drill E2E.
- [ ] Xác minh history/settings/disable/export/delete với retention và recent-auth policy.
- [ ] Xác minh Expo push token lifecycle và receipt trên thiết bị thật.

### Device and release acceptance

- [ ] Chạy VoiceOver/TalkBack, external-keyboard focus và font 200% theo device matrix.
- [ ] Tạo Android/iOS internal build đã ký và ghi build ID/thiết bị/kết quả.
- [ ] Xác minh Sentry source-map upload/symbolication và PII scrub trên staging build.
- [ ] Chạy Maestro smoke trên internal binary; fixture smoke không thay remote E2E.
- [ ] Nghiệm thu TestFlight/Google Play Internal Testing trước khi mở beta.

## 5. Baseline đã kiểm chứng

Tại lần bàn giao MA7 ngày 02/08/2026:

- ESLint và TypeScript xanh.
- 105 test case trong 33 suite xanh.
- `expo install --check` và `expo-doctor` 20/20 xanh.
- `expo export --platform all` thành công cho Android, iOS và web.
- EAS profiles, Maestro fixture smoke, device matrix và release/rollback runbook đã có.

Phải chạy lại các check thực tế sau mỗi thay đổi. Baseline cũ không chứng minh
build hiện tại hoặc remote backend đang hoạt động.

## 6. Definition of Done

Mobile sẵn sàng internal release khi:

- Tất cả remote-integration gate ở trên xanh trên staging gần production.
- Loading/empty/error/offline/disabled state không hiển thị thành công giả.
- Touch target, screen reader, focus, reduced motion và font scaling đạt device matrix.
- Sentry/log không chứa token, authorization header hoặc PII không cần thiết.
- Internal build đã ký và store testing được ghi nhận theo
  [`03-RELEASE.md`](03-RELEASE.md).

## 7. Bước tiếp theo

Không làm lại M01–M12. Bắt đầu S1 trong
[`02-SUPABASE-MVP.md`](02-SUPABASE-MVP.md), sau đó nối từng remote contract và đóng các
gate còn mở ở trên bằng test evidence.
