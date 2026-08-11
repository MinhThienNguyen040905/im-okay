# I’m Okay — Support và incident runbook

Runbook này áp dụng cho personal pilot, internal alpha và các stage sau. Không ghi credential, raw
token, bearer URL, email/số điện thoại cá nhân hoặc body notification vào ticket/chat/evidence.

## 1. Ownership và kênh

| Vai trò            | Trách nhiệm                                                  | Trạng thái trước internal alpha      |
| ------------------ | ------------------------------------------------------------ | ------------------------------------ |
| Release owner      | Quyết định go/hold/rollback; xác nhận contact/device consent | Project owner; cần ghi tên/kênh trực |
| Incident commander | Điều phối, timestamp, severity và communication              | `OWNER REQUIRED`                     |
| Backend/operator   | Kill switch, Supabase/Cron/queue/provider và recovery        | `OWNER REQUIRED`                     |
| Mobile/web         | Reproduce, binary/build/domain rollback                      | `OWNER REQUIRED`                     |
| Support/privacy    | Nhận yêu cầu user/contact/export/deletion                    | `OWNER REQUIRED`                     |

Trước internal alpha phải có email/kênh support public, kênh incident private, người thay thế và một
test ticket xác minh notification/ownership. Personal pilot một owner có thể giữ nhiều vai trò nhưng
không được bỏ trống cách liên lạc hoặc quyền tắt delivery.

## 2. Severity và stop criteria

| Mức   | Ví dụ                                                                                                     | Hành động ban đầu                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| SEV-0 | Mất/sai/duplicate alert; check-in false success; auth/RLS/token bypass; secret/PII leak                   | Stop rollout/pilot, tắt delivery nếu notification liên quan, cô lập route bị ảnh hưởng, báo owner ngay |
| SEV-1 | Scheduler/Cron dừng, queue không reconcile, provider outage/unknown diện rộng, không tắt được kill switch | Hold, không mở thêm tester, giữ queue và điều tra unknown trước retry                                  |
| SEV-2 | Một device không nhận push, UI critical flow lỗi nhưng có workaround an toàn                              | Ghi build/device/correlation đã scrub, giới hạn scope, fix trước mở rộng                               |
| SEV-3 | Copy/layout/non-critical defect                                                                           | Triage theo release backlog                                                                            |

I’m Okay không phải dịch vụ cứu hộ. Support không hứa sẽ điều người trợ giúp, xác nhận người dùng an
toàn hoặc thay thế số khẩn cấp địa phương.

## 3. Quy trình 15 phút đầu

1. Ghi thời điểm ICT/UTC, reporter, environment, app version/build, symptom và severity; không chép
   token/credential/PII.
2. Stop/hold stage hiện tại. Với sự cố delivery/provider, đặt
   `NOTIFICATION_DELIVERY_ENABLED=false`; không xóa queue và không retry outcome `unknown` hàng loạt.
3. Chụp aggregate ops snapshot: function errors, heartbeat/Cron failure, queue depth/oldest age,
   outbox failed/pending, overdue, retry/unknown/dead-letter.
4. Khoanh vùng bằng correlation ID, delivery ID hoặc user ID đã scrub; kiểm tra audit/provider receipt.
5. Chọn containment theo bảng dưới và ghi từng mutation/operator action vào timeline.
6. Release owner quyết định giữ hold, rollback compatible function/client hoặc tiếp tục giám sát.

## 4. Containment theo loại sự cố

- Provider outage/Google account: tắt delivery, giữ queue, phân loại `transient` và `unknown`; không coi
  SMTP timeout là chưa gửi. Chỉ bật lại trong supervised window sau provider readiness.
- Scheduler/Cron/queue: giữ provider state, kiểm tra heartbeat/Cron run, chạy reconciliation theo
  runbook và xác minh business key/idempotency trước consumer.
- Public bearer link: tắt route/hosting nếu cần, revoke token digest bị ảnh hưởng, rotate secret liên
  quan và xác minh response generic không hỗ trợ enumeration.
- Auth/RLS/IDOR: tắt client rollout/public surface bị ảnh hưởng; không dùng service role để bỏ qua lỗi
  nhằm tiếp tục pilot.
- Mobile binary: dừng phân phối build; rollback về exact known-good build nếu schema/function vẫn tương
  thích. Không rollback migration phá dữ liệu.
- Secret/PII leak: revoke/rotate theo phạm vi, xóa artifact chia sẻ không an toàn khi có thể, bảo toàn
  audit hợp lệ và đánh giá nghĩa vụ thông báo với owner/legal.

## 5. Recovery và đóng incident

Chỉ recover khi root cause/containment đã rõ, preflight + security/ops snapshot xanh, unknown delivery
đã đối soát và một smoke với test recipient/device consented pass. Mở lại theo từng bước nhỏ; theo dõi
ít nhất một scheduler/provider interval trước khi mở rộng.

Biên bản đóng phải có: impact và time window, root cause, affected scope đã scrub, actions, evidence,
go/hold decision, follow-up owner/date và test hồi quy. SEV-0/SEV-1 cần post-incident review; không đóng
chỉ vì metric đã trở lại bình thường.

## 6. Support intake tối thiểu

Support chỉ yêu cầu: environment, app version/build, device/OS, thời điểm, bước tái hiện và ảnh đã che
PII. Không yêu cầu password, magic link, public invitation/alert URL, push token hoặc service key.

- Nguy hiểm tức thời: hướng người báo liên hệ số khẩn cấp/người ở gần; không chờ I’m Okay.
- Push không đến: kiểm tra quyền/system state, device registration scrubbed và provider receipt; không
  gửi alert thử tới contact chưa consent.
- Sai deadline/check-in: coi là ít nhất SEV-1 đến khi xác minh authoritative server projection.
- Export/deletion/privacy: xác minh recent auth theo workflow; ghi request ID/correlation đã scrub và
  chuyển privacy owner. Không hứa completion date khi retention/SLA chưa được owner phê duyệt.

## 7. Drill gate

- [ ] Kênh support public nhận và trả lời test ticket.
- [ ] Incident channel private có release owner + backup owner.
- [ ] Kill switch được operator xác minh trong supervised staging window.
- [ ] Tabletop SEV-0 missing/duplicate alert hoàn tất với go/hold/rollback decision.
- [ ] Tabletop SEV-1 provider unknown và queue reconciliation hoàn tất.
- [ ] Timeline/post-incident template được điền bằng dữ liệu synthetic, không PII/token.

Các fault drill mutation trên hosted staging chỉ chạy bằng harness test-scoped, trên synthetic data và
khi delivery đã được operator chứng minh đang tắt. Không dùng RPC production hiện có để xóa/claim work
thật chỉ nhằm đóng checklist.
