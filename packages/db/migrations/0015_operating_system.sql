-- ============================================================
-- The full operating layer.
--
-- Seven rooms the product promised but the schema didn't hold yet:
--
--   device_connection       how a loved one's readings can arrive — a
--                            capability registry, never an assumption that
--                            every device can do everything
--   wellness_check_request  Request Check: a family member asks, the person
--                            at the centre decides. Consent-first by shape:
--                            nothing is read until they share.
--   wellness_check_result   what came back, as calm metrics + one sentence
--   trust_log               who looked, who asked, who changed access —
--                            visible to the whole family, because trust
--                            is built in the open
--   care_plan               the standing knowledge about one person: routine,
--                            diet, mobility, the doctor, the pharmacy
--   family_handover         one carer passes the day to the next, in words
--   proof_of_care_report    the week, accounted for — visits, doses,
--                            receipts, duties — for families far away
--
-- Plus quiet mode on the person themselves (non-urgent requests pause),
-- and a consent scope for wellness checks. RLS as always: the database
-- decides who sees what, not the app.
-- ============================================================

-- ---------- consent: wellness checks become a first-class scope ----------

alter table consent_grant drop constraint consent_grant_scope_check;
alter table consent_grant add constraint consent_grant_scope_check
  check (scope in ('health','money','documents','location','full','wellness_checks'));

-- ---------- quiet mode ----------

-- "Mum is resting. Non-urgent requests resume at 08:00."
alter table care_subject add column if not exists quiet_until timestamptz;
alter table care_subject add column if not exists quiet_note text;

-- ---------- device connections: capability registry ----------

create table device_connection (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  provider text not null check (provider in
    ('apple_health','health_connect','samsung_health','withings','bluetooth_device','manual','caregiver')),
  label text,
  -- {"supportedMetrics":["heart_rate",...],"canRequestLiveCheck":false,
  --  "canReadLatest":true,"requiresUserApproval":true}
  capabilities jsonb not null default '{}',
  permission_status text not null default 'granted'
    check (permission_status in ('granted','partial','pending','revoked')),
  status text not null default 'active' check (status in ('active','paused','disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subject_id, provider)
);

-- ---------- Request Check ----------

create table wellness_check_request (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  requested_by uuid not null references family_member,
  check_type text not null check (check_type in
    ('quick','heart_rate','blood_pressure','spo2','temperature','movement','sleep',
     'medication','manual_checkin','caregiver_confirm')),
  message text,
  status text not null default 'pending'
    check (status in ('pending','later','shared','declined','expired','cancelled')),
  respond_by timestamptz not null default now() + interval '4 hours',
  responded_at timestamptz,
  result_signal_id uuid references life_signal,
  created_at timestamptz not null default now()
);
create index idx_check_subject on wellness_check_request (subject_id, created_at desc);
create index idx_check_open on wellness_check_request (respond_by)
  where status in ('pending','later');

create table wellness_check_result (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references wellness_check_request on delete cascade,
  subject_id uuid not null references care_subject on delete cascade,
  metrics jsonb not null default '{}',
  summary text not null,
  worth_a_check boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- trust log ----------

create table trust_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  actor_member_id uuid references family_member on delete set null,
  action text not null check (action in
    ('viewed_emergency_profile','requested_check','responded_check','changed_consent',
     'changed_role','exported_records','downloaded_document','raised_alert',
     'viewed_health','changed_quiet_mode')),
  subject_id uuid references care_subject on delete set null,
  detail text,
  at timestamptz not null default now()
);
create index idx_trust_ws on trust_log (workspace_id, at desc);

-- ---------- care plan ----------

create table care_plan (
  subject_id uuid primary key references care_subject on delete cascade,
  daily_routine text,
  dietary_notes text,
  mobility_notes text,
  emergency_instructions text,
  preferred_pharmacy text,
  doctor_name text,
  doctor_phone text,
  family_rules text,
  updated_by uuid references family_member,
  updated_at timestamptz not null default now()
);

-- ---------- family handover ----------

create table family_handover (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  from_member_id uuid references family_member,
  to_member_id uuid references family_member,
  body text not null,
  note text,
  status text not null default 'open' check (status in ('open','acknowledged')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index idx_handover_subject on family_handover (subject_id, created_at desc);

-- ---------- proof of care ----------

create table proof_of_care_report (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  week_start date not null,
  body text not null,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (workspace_id, week_start)
);

-- ---------- verb grants ----------

grant select, insert, update, delete on device_connection to kinos_app;
grant select, insert, update on wellness_check_request to kinos_app;
grant select, insert on wellness_check_result to kinos_app;
grant select, insert on trust_log to kinos_app;
grant select, insert, update on care_plan to kinos_app;
grant select, insert, update on family_handover to kinos_app;
grant select on proof_of_care_report to kinos_app;   -- written by the weekly job

-- ---------- RLS ----------

alter table device_connection enable row level security;
alter table wellness_check_request enable row level security;
alter table wellness_check_result enable row level security;
alter table trust_log enable row level security;
alter table care_plan enable row level security;
alter table family_handover enable row level security;
alter table proof_of_care_report enable row level security;

-- Device registry: the family may see how readings arrive; the person,
-- admins and members manage it.
create policy device_select on device_connection for select
  using (is_member(subject_ws(subject_id)));
create policy device_insert on device_connection for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));
create policy device_update on device_connection for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));
create policy device_delete on device_connection for delete
  using (my_role(subject_ws(subject_id)) in ('admin','care_recipient'));

-- Asking for a check needs standing: admins, the person themselves, or a
-- member holding a wellness_checks (or full) grant. Everyone in the family
-- can see that a check was asked for — that openness is the feature.
create policy check_select on wellness_check_request for select
  using (is_member(subject_ws(subject_id)));
create policy check_insert on wellness_check_request for insert
  with check (
    my_role(subject_ws(subject_id)) in ('admin','care_recipient')
    or has_consent(subject_id, array['wellness_checks','full'])
  );
-- The centre answers; the asker may cancel; admins may tidy.
create policy check_update on wellness_check_request for update
  using (
    my_role(subject_ws(subject_id)) in ('admin','care_recipient')
    or requested_by = my_member_id(subject_ws(subject_id))
  );

-- Results can carry numbers, so they follow health visibility: the person,
-- admins, and holders of health/wellness consent.
create policy checkresult_select on wellness_check_result for select
  using (
    my_role(subject_ws(subject_id)) in ('admin','care_recipient')
    or has_consent(subject_id, array['health','full','wellness_checks'])
  );
create policy checkresult_insert on wellness_check_result for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','caregiver','care_recipient'));

-- The trust log is deliberately family-visible: everyone can see who
-- looked, asked, or changed access. Nobody can edit or erase it.
create policy trust_select on trust_log for select
  using (is_member(workspace_id));
create policy trust_insert on trust_log for insert
  with check (is_member(workspace_id));

-- The care plan is working knowledge — caregivers need it at the door.
create policy careplan_select on care_plan for select
  using (is_member(subject_ws(subject_id)));
create policy careplan_insert on care_plan for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));
create policy careplan_update on care_plan for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));

-- Handover: anyone caring can write one; the receiver (or an admin) closes it.
create policy handover_select on family_handover for select
  using (is_member(subject_ws(subject_id)));
create policy handover_insert on family_handover for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','caregiver'));
create policy handover_update on family_handover for update
  using (
    my_role(subject_ws(subject_id)) = 'admin'
    or to_member_id = my_member_id(subject_ws(subject_id))
    or from_member_id = my_member_id(subject_ws(subject_id))
  );

-- Proof of care: the whole family reads the week's account.
create policy proof_select on proof_of_care_report for select
  using (is_member(workspace_id));
