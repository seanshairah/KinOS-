-- ============================================================
-- KinOS core schema.
-- Every table: uuid pk, created_at, RLS enabled (policies in 0003).
-- life_signal is append-only: no update/delete grants or policies exist,
-- and a trigger backstops even privileged paths.
-- ============================================================

-- ---------- identity & access ----------

create table family_workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references app_user,
  plan_id text not null default 'free',
  created_at timestamptz not null default now()
);

create table family_member (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  user_id uuid references app_user,
  display_name text,
  role text not null check (role in ('admin','member','caregiver','care_recipient','viewer','emergency')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table invitation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  email text,
  phone text,
  role text not null check (role in ('admin','member','caregiver','care_recipient','viewer','emergency')),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  scopes text[] not null default '{}',
  invited_by uuid references family_member,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

-- Consent is a first-class object: who may see what, about whom, until when.
create table consent_grant (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  grantee_member_id uuid not null references family_member on delete cascade,
  scope text not null check (scope in ('health','money','documents','location','full')),
  granted_by uuid references family_member,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table access_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  actor_member_id uuid,
  action text not null,
  target text,
  at timestamptz not null default now()
);

-- ---------- people / orbits ----------

create table care_subject (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  display_name text not null,
  kind text check (kind in ('elder','child','recovery','disability','self')),
  avatar_url text,
  timezone text not null default 'Africa/Harare',
  expected_checkin_by text,
  expected_visit_every_hours int,
  created_at timestamptz not null default now()
);

create table emergency_profile (
  subject_id uuid primary key references care_subject on delete cascade,
  blood_type text,
  conditions text[] not null default '{}',
  allergies text[] not null default '{}',
  medications text[] not null default '{}',
  instructions text,
  share_location boolean not null default false,
  updated_at timestamptz not null default now()
);

create table emergency_contact (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  priority int not null default 1,
  created_at timestamptz not null default now()
);

create table medical_note (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  author_member_id uuid references family_member,
  body text not null,
  privacy_level text not null default 'medical_private'
    check (privacy_level in ('family','admin_only','caregiver_visible','medical_private')),
  at timestamptz not null default now()
);

-- ---------- the engine ----------

create table life_signal (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  member_id uuid references family_member,
  signal_type text not null,
  source text not null,
  value jsonb,
  unit text,
  privacy_level text not null default 'family'
    check (privacy_level in ('family','admin_only','caregiver_visible','medical_private')),
  occurred_at timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now()
);

create table signal_interpretation (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references life_signal on delete cascade,
  label text not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  extracted jsonb,
  model text,
  created_at timestamptz not null default now()
);

create table baseline_metric (
  subject_id uuid not null references care_subject on delete cascade,
  metric text not null,
  "window" text not null,
  mean numeric,
  stddev numeric,
  n int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subject_id, metric, "window")
);

create table attention_event (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  kind text not null,
  severity text not null default 'attention' check (severity in ('watch','attention','urgent')),
  title text not null,
  detail text,
  status text not null default 'open' check (status in ('open','ack','resolved','snoozed')),
  owner_member_id uuid references family_member,
  escalate_at timestamptz,
  resolved_at timestamptz,
  source_signal_id uuid references life_signal,
  dedupe_key text,
  created_at timestamptz not null default now()
);
-- One live attention event per dedupe key (nulls never conflict).
create unique index idx_attention_dedupe on attention_event (dedupe_key)
  where status in ('open','ack','snoozed');

create table pattern (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  metric text not null,
  direction text not null check (direction in ('up','down','steady','irregular')),
  summary text not null,
  "window" text not null,
  at timestamptz not null default now()
);

-- Dead letters for the signal pipeline: failed stages land here for review.
create table pipeline_dead_letter (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid,
  stage text not null,
  error text,
  payload jsonb,
  retries int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- care workflow ----------

create table duty (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  title text not null,
  note text,
  owner_member_id uuid references family_member,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','done','late','reassigned')),
  proof_url text,
  recurrence jsonb,
  escalate_at timestamptz,
  completed_at timestamptz,
  created_by uuid references family_member,
  created_at timestamptz not null default now()
);

create table medication (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  name text not null,
  dose text,
  schedule jsonb not null default '{"times": []}',
  refill_at date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table dose_log (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medication on delete cascade,
  subject_id uuid not null references care_subject on delete cascade,
  status text not null check (status in ('taken','missed','skipped')),
  scheduled_for timestamptz,
  at timestamptz not null default now(),
  member_id uuid references family_member
);

create table appointment (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  kind text not null default 'clinic'
    check (kind in ('clinic','school','transport','family_call','refill','other')),
  title text not null,
  location text,
  starts_at timestamptz not null,
  transport_owner_member_id uuid references family_member,
  transport_confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table caregiver_visit (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  caregiver_member_id uuid references family_member,
  check_in timestamptz,
  check_out timestamptz,
  tasks jsonb,
  notes text,
  evidence_url text,
  created_at timestamptz not null default now()
);

-- ---------- money ----------

create table money_pot (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  subject_id uuid references care_subject on delete set null,
  name text not null default 'Care fund',
  currency text not null default 'USD',
  balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table contribution (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references money_pot on delete cascade,
  member_id uuid references family_member,
  amount numeric not null check (amount > 0),
  currency text not null,
  note text,
  payment_intent_id uuid,
  at timestamptz not null default now()
);

create table expense (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references money_pot on delete cascade,
  member_id uuid references family_member,
  amount numeric not null check (amount > 0),
  currency text not null,
  category text not null default 'other'
    check (category in ('medication','groceries','transport','utilities','school','care','medical','other')),
  note text,
  receipt_url text,
  at timestamptz not null default now()
);

-- Internal double-entry ledger; every contribution/expense writes a row.
create table ledger_entry (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references money_pot on delete cascade,
  ref_type text not null check (ref_type in ('contribution','expense','reimbursement','adjustment')),
  ref_id uuid,
  debit numeric not null default 0 check (debit >= 0),
  credit numeric not null default 0 check (credit >= 0),
  at timestamptz not null default now(),
  check (debit = 0 or credit = 0)
);

create table payment_intent (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  pot_id uuid references money_pot,
  provider text not null check (provider in ('stripe','paynow')),
  amount numeric not null,
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','succeeded','failed','cancelled')),
  external_id text,
  idempotency_key text unique,
  meta jsonb,
  at timestamptz not null default now()
);

-- ---------- records & memory ----------

create table family_record_item (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  kind text not null default 'note'
    check (kind in ('note','document','decision','incident','question','summary')),
  title text not null,
  body text,
  privacy_level text not null default 'family'
    check (privacy_level in ('family','admin_only','caregiver_visible','medical_private')),
  author_member_id uuid references family_member,
  at timestamptz not null default now()
);

create table document (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  record_item_id uuid references family_record_item on delete set null,
  storage_path text not null,
  mime text,
  title text,
  privacy_level text not null default 'family'
    check (privacy_level in ('family','admin_only','caregiver_visible','medical_private')),
  created_at timestamptz not null default now()
);

create table decision_log (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  summary text not null,
  decided_by uuid references family_member,
  at timestamptz not null default now()
);

create table record_embedding (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  record_item_id uuid not null references family_record_item on delete cascade,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- ---------- briefs, alerts, notifications ----------

create table daily_brief (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  kind text not null default 'morning'
    check (kind in ('morning','evening','weekly','money','caregiver','school','health_pattern')),
  body text not null,
  actions jsonb,
  for_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table notification (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_member on delete cascade,
  channel text not null default 'push' check (channel in ('push','email','whatsapp','in_app')),
  title text not null,
  body text,
  link text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  read_at timestamptz,
  sent_at timestamptz not null default now()
);

create table push_subscription (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_member on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table escalation_rule (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  kind text not null,
  ladder jsonb not null default '[]',
  quiet_hours jsonb,
  created_at timestamptz not null default now()
);

create table emergency_alert (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  raised_by uuid references family_member,
  at timestamptz not null default now(),
  contacts_notified jsonb,
  response_ms int,
  resolved_at timestamptz,
  note text
);

-- ---------- business ----------

create table plan (
  id text primary key,
  name text not null,
  price_cents int not null default 0,
  features jsonb not null default '[]'
);

create table subscription (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  plan_id text not null references plan,
  provider text check (provider in ('stripe','paynow')),
  status text not null default 'active'
    check (status in ('active','trialing','past_due','cancelled')),
  external_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table usage_limit (
  workspace_id uuid not null references family_workspace on delete cascade,
  key text not null,
  used int not null default 0,
  cap int,
  primary key (workspace_id, key)
);

-- Activation funnel instrumentation (onboarding is the activation event).
create table activation_event (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references family_workspace on delete cascade,
  step text not null check (step in
    ('workspace_created','orbit_created','member_added','first_checkin','first_duty','first_brief')),
  at timestamptz not null default now(),
  unique (workspace_id, step)
);

-- ---------- indexes ----------

create index idx_member_workspace on family_member (workspace_id);
create index idx_member_user on family_member (user_id);
create index idx_invitation_workspace on invitation (workspace_id);
create index idx_consent_subject on consent_grant (subject_id);
create index idx_consent_grantee on consent_grant (grantee_member_id);
create index idx_access_log_ws on access_log (workspace_id, at desc);
create index idx_subject_workspace on care_subject (workspace_id);
create index idx_signal_subject_time on life_signal (subject_id, occurred_at desc);
create index idx_signal_member on life_signal (member_id);
create index idx_interp_signal on signal_interpretation (signal_id);
create index idx_attention_subject on attention_event (subject_id);
create index idx_attention_state on attention_event (status, escalate_at);
create index idx_pattern_subject on pattern (subject_id, at desc);
create index idx_duty_subject on duty (subject_id, status);
create index idx_duty_owner on duty (owner_member_id, status);
create index idx_medication_subject on medication (subject_id);
create index idx_dose_medication on dose_log (medication_id, at desc);
create index idx_dose_subject on dose_log (subject_id, at desc);
create index idx_appt_subject on appointment (subject_id, starts_at);
create index idx_visit_subject on caregiver_visit (subject_id, check_in desc);
create index idx_pot_workspace on money_pot (workspace_id);
create index idx_contribution_pot on contribution (pot_id, at desc);
create index idx_expense_pot on expense (pot_id, at desc);
create index idx_ledger_pot on ledger_entry (pot_id, at desc);
create index idx_payment_ws on payment_intent (workspace_id);
create index idx_payment_external on payment_intent (provider, external_id);
create index idx_record_subject on family_record_item (subject_id, at desc);
create index idx_document_subject on document (subject_id);
create index idx_embedding_subject on record_embedding (subject_id);
create index idx_brief_subject on daily_brief (subject_id, for_date desc);
create index idx_notification_member on notification (member_id, sent_at desc);
create index idx_alert_subject on emergency_alert (subject_id, at desc);
create index idx_subscription_ws on subscription (workspace_id);

create index idx_embedding_vector on record_embedding
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------- append-only enforcement for life_signal ----------

create or replace function forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'life_signal is append-only';
end $$;

create trigger life_signal_no_update before update on life_signal
  for each row execute function forbid_mutation();
create trigger life_signal_no_delete before delete on life_signal
  for each row execute function forbid_mutation();
