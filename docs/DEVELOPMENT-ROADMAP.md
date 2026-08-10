# I’m Okay — Master development roadmap

## 1. Cách dùng roadmap

Roadmap chỉ giữ bốn milestone sản phẩm và thứ tự hiện tại. Task/test chi tiết nằm
trong ba plan:

| Plan                                                   | Vai trò                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [`plans/01-MOBILE-APP.md`](plans/01-MOBILE-APP.md)     | Trạng thái mobile M01–M12 và remote/device gate còn mở                                       |
| [`plans/02-SUPABASE-MVP.md`](plans/02-SUPABASE-MVP.md) | Plan implementation đang hoạt động: contact web + Supabase backend + notifications + staging |
| [`plans/03-RELEASE.md`](plans/03-RELEASE.md)           | Quality/security gate cho staging RC, internal alpha, beta và production                     |

Không tạo roadmap song song trong từng plan. ADR giữ quyết định kiến trúc; code,
migration và automated test là bằng chứng hành vi hiện tại.

## 2. Trạng thái hiện tại

Mốc tham chiếu: 2026-08-10.

| Hạng mục                              | Trạng thái                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Product brief, UX flow, design system | Đã có bản nền                                                                              |
| Mobile M01–M12                        | Client MA0–MA6 và MA7 repository hardening hoàn tất                                        |
| Mobile remote/device acceptance       | Android auth/check-in smoke xanh; exact-commit FCM build đang chạy; full matrix để sau MVP |
| Contact web W01–W05                   | Đã deploy Vercel; invitation đã gửi, contact acceptance/pilot alert còn mở                 |
| Supabase backend                      | 8 migration + 5 Edge Functions, hosted Cron/security/ops baseline đã xanh                  |
| Workspace/CI                          | Mobile/contact/contracts/functions/database đã có root scripts và GitHub Actions workflow  |
| Staging/store                         | Personal-pilot gate hiện tại; fault/restore/SLO/iOS/store chuyển sang hardening            |

Việc rút sáu plan cũ thành ba plan không reset mobile. Chi tiết 57 checkbox client đã
hoàn thành được tóm tắt trong Plan 01 và giữ bằng chứng tại ADR 0001–0007.

## 3. Phạm vi MVP

Phạm vi sản phẩm vẫn là Android/iOS, nhưng lát cắt phát hành sớm nhất là **Android personal pilot**:
owner dùng trên một thiết bị thật với tối đa ba test contact đã consent, có giám sát và kill switch.
iOS, store rollout và ma trận thiết bị đầy đủ không bị xóa; chúng chuyển sang post-MVP hardening.

- Expo mobile cho Android/iOS.
- Responsive contact web không yêu cầu tài khoản/app install.
- Supabase Auth email/Google, PostgreSQL/RLS/RPC và Edge Functions.
- Check-in 24/36/48 giờ với authoritative deadline khi app đóng.
- Tối đa ba trusted contacts, invitation acceptance và public alert response.
- Supabase Cron + Queues/outbox cho scheduling, retry và reconciliation.
- Expo Push + EmailProvider cho reminder, invitation, alert và correction; Gmail SMTP chỉ là
  personal-pilot adapter, verified-domain HTTP provider là gate trước triển khai rộng.
- Snooze có thời hạn, guarded SOS, drill, history, settings và account-data request.
- Audit, idempotency, security/privacy, monitoring và backup/restore.

Ngoài MVP: SMS/Zalo/WhatsApp/voice, tự liên hệ cấp cứu, vị trí liên tục, AI,
wearable và thanh toán.

## 4. Kiến trúc đã chốt

```text
Mobile + contact web
        |
Supabase Auth + Edge Functions
        |
PostgreSQL + RLS/RPC
        |
Cron + Queues/outbox + Edge consumers
        |
Expo Push + EmailProvider
```

ADR 0008 là quyết định hiện hành: không scaffold NestJS/Prisma/Redis/BullMQ và không
thêm Firebase làm application backend song song trong MVP. ADR 0013 chỉ cho phép FCM transport
bắt buộc cho Android Expo Push; không có Firebase Auth/data/functions. PostgreSQL domain state
phải đủ để dựng lại missing queue work.

## 5. Bốn milestone sản phẩm

### P0 — Mobile client ready

Trạng thái: **Hoàn tất phần repository; external acceptance còn mở.**

- M01–M12, fixture mode và authoritative remote adapters đã có.
- Accessibility/link/Sentry/EAS/Maestro repository hardening đã có.
- Mobile không tự tính production deadline hoặc nhận public contact token.

Gate: Plan 01 ghi nhận đúng phần đã hoàn thành và các gate còn mở.

### P1 — Working MVP check-in

Trạng thái: **Hoàn tất trong local/integration ngày 04/08/2026.**

Phạm vi: S1 Foundation + S2 Core check-in trong Plan 02.

- Supabase local, migrations, RLS, Edge routers, contracts và CI.
- Auth/profile/device/safety plan.
- Authoritative check-in transaction, deadline, Cron/Queues và reconciliation.
- Mobile MA2–MA3 chạy remote.

Evidence chính: migration từ database trống, 74 pgTAP test, database lint, Edge/local auth smoke,
hai check-in đồng thời cùng idempotency key, queue deletion/lease-expiry recovery, 109 mobile test
và Android/iOS/web export đều xanh. Staging/device/provider thật không thuộc gate P1.

Gate:

- Máy mới chạy local stack từ database trống.
- RLS/JWT negative test và contract compatibility xanh.
- Concurrent/offline/timeout check-in không tạo false success hay chu kỳ trùng.
- Queue loss có thể reconciliation lại mà không gửi trùng.

### P2 — Personal-pilot MVP on staging

Trạng thái: **Hosted baseline hoàn tất; personal-pilot acceptance đang thực hiện.**

Phạm vi: S3 Contacts/alerts/contact web + S4A/S4B baseline + S4C personal-pilot acceptance trong
Plan 02.

- Trusted contacts, invitation W01 và contact web W02–W05.
- Alert escalation, Expo Push, email, correction, snooze, SOS và drill.
- History/settings/account-data request.
- Một accelerated full flow với provider thật trên staging; security/ops baseline đã có.

Gate:

- Invitation→alert→response→correction chạy end-to-end với test recipients.
- Không duplicate/missing alert; `delivered` không tự acknowledge/resolve.
- Public token/PII không lọt qua projection/log/referrer/cache.
- Delivery được tắt lại sau smoke và known limitations được ghi rõ.

Function/queue/provider failure drill, database restore, SLO dài hạn, full accessibility, iOS và store
không còn chặn P2 personal pilot; chúng thuộc S4D và P3 internal release.

### P3 — Internal release

Trạng thái: **Chưa bắt đầu.**

Phạm vi: staging RC gate và internal alpha trong Plan 03.

- Device/accessibility matrix và remote E2E xanh.
- Signed Android/iOS internal builds, Sentry symbolication và exact release metadata.
- Google Play Internal Testing/TestFlight với test users/contacts đã consent.
- Monitoring, support/incident channel và go/hold/rollback owner hoạt động.

Gate: không còn release blocker trong Plan 03.

Closed beta và production chỉ mở sau P3, theo checklist Plan 03 và dữ liệu staging/alpha;
không tự chốt SLO hoặc rollout percentage trước khi đo.

## 6. Thứ tự hiện tại

```text
P0 complete
   |
   v
S1 Foundation complete
   v
S2 Core check-in complete
   v
S3 Contacts + alerts + contact web complete locally
   v
S4A/S4B hosted baseline complete
   v
S4C Personal-pilot acceptance (current)
   v
P2 Android personal pilot
   v
S4D Post-MVP hardening
   v
P3 Internal release gate
```

S4A/S4B đã hoàn tất hosted baseline: 8 migration, 5 Edge Functions, Vault workers, Vercel contact
web, Auth URL/CORS, hosted security matrix, ops snapshot, Gmail SMTP invitation và Android device
smoke. Delivery kill switch đang tắt. Firebase chỉ được cấu hình làm FCM transport cho Expo Push;
EAS secret file/FCM V1 credential đã có và build exact commit
`61b9016f-3a3f-4087-aae3-b2be119d65f6` đang chạy. Fast path S4C chỉ còn: cài artifact +
token/ticket/receipt, contact acceptance, rồi một accelerated alert/response/correction cycle và tắt
delivery. Không tạo thêm build hoặc mở các nhánh hardening trước khi smoke hiện tại lộ blocker thật.

Sau P2, S4D mới xử lý Google/fresh-user, fault/reconciliation drill, restore, measured SLO, full
accessibility, Sentry, iOS và store. Không dùng fake-provider/config-only evidence để đóng gate cần
provider hoặc thiết bị thật.

## 7. Quy tắc cập nhật

- Cập nhật checkbox S1–S4 trong Plan 02 khi code/test evidence thay đổi.
- Cập nhật Plan 01 chỉ khi mobile contract, remote gate hoặc device evidence thay đổi.
- Cập nhật Plan 03 khi release evidence/gate thay đổi.
- Cập nhật roadmap chỉ khi milestone/gate/order thay đổi.
- Thay đổi framework/provider/state machine/schema cốt lõi/retention phải dùng ADR.
- Không đánh dấu complete chỉ vì code compile, config đã có hoặc provider trả `accepted`.
