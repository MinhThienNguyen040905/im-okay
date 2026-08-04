alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_devices enable row level security;
alter table public.user_devices force row level security;
alter table public.safety_plans enable row level security;
alter table public.safety_plans force row level security;
alter table public.trusted_contacts enable row level security;
alter table public.trusted_contacts force row level security;
alter table public.contact_invitations enable row level security;
alter table public.contact_invitations force row level security;
alter table public.check_ins enable row level security;
alter table public.check_ins force row level security;
alter table public.alerts enable row level security;
alter table public.alerts force row level security;
alter table public.alert_steps enable row level security;
alter table public.alert_steps force row level security;
alter table public.alert_responses enable row level security;
alter table public.alert_responses force row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_deliveries force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;
alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;
alter table public.scheduling_intents enable row level security;
alter table public.scheduling_intents force row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy user_devices_select_own
  on public.user_devices
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy safety_plans_select_own
  on public.safety_plans
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy trusted_contacts_select_own
  on public.trusted_contacts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy check_ins_select_own
  on public.check_ins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy alerts_select_own
  on public.alerts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.safety_plans
      where safety_plans.id = alerts.safety_plan_id
        and safety_plans.user_id = (select auth.uid())
    )
  );

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.user_devices to authenticated;
grant select on public.safety_plans to authenticated;
grant select on public.trusted_contacts to authenticated;
grant select on public.check_ins to authenticated;
grant select on public.alerts to authenticated;

revoke all on public.contact_invitations from anon, authenticated;
revoke all on public.alert_steps from anon, authenticated;
revoke all on public.alert_responses from anon, authenticated;
revoke all on public.notification_deliveries from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.outbox_events from anon, authenticated;
revoke all on public.scheduling_intents from anon, authenticated;
