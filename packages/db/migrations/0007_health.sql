-- ============================================================
-- Health signals foundation.
--
-- Readings from health devices and apps (a blood-pressure cuff, a watch,
-- Apple Health / Health Connect uploads, or a caregiver typing a number)
-- land in health_reading. The reducer turns them into calm, non-diagnostic
-- health_observation rows; anything that genuinely needs someone becomes a
-- normal attention_event, so "needs attention / okay" stays family-visible
-- without exposing a single number.
--
-- Consent is finer-grained here than anywhere else: on top of the existing
-- health consent grant, the centre (or an admin) sets a per-metric dial in
-- health_share_scope —
--   'readings'      raw numbers visible to health-consented members
--   'observations'  only derived sentences visible (default)
--   'status'        nothing beyond family-level attention events
-- Enforced by RLS, not app code, like everything else.
-- ============================================================

-- ---------- tables ----------

create table health_reading (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  member_id uuid references family_member,        -- who entered it, for manual readings
  metric text not null check (metric in
    ('blood_pressure','heart_rate','sleep_minutes','steps','weight','glucose','spo2')),
  value jsonb not null,                            -- {"systolic":152,"diastolic":94} / {"value":62}
  unit text,
  source text not null check (source in ('withings','apple_health','health_connect','manual')),
  device jsonb,                                    -- model/firmware metadata, if the source sends it
  external_id text,                                -- provider's id, for idempotent device pushes
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Data minimisation: raw readings expire; observations are what we keep.
  expires_at timestamptz not null default now() + interval '180 days'
);
-- A device re-sending the same measurement is a no-op.
create unique index idx_hreading_external on health_reading (source, external_id)
  where external_id is not null;
create index idx_hreading_subject on health_reading (subject_id, metric, taken_at desc);
create index idx_hreading_expiry on health_reading (expires_at);

create table health_observation (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  metric text not null,
  kind text not null check (kind in ('drift','pattern')),
  summary text not null,                           -- one calm sentence, never a verdict
  detail text,
  "window" text,                                   -- e.g. '8d'
  source jsonb,                                    -- {"reading_ids":[...]}
  attention_event_id uuid references attention_event on delete set null,
  created_at timestamptz not null default now()
);
create index idx_hobs_subject on health_observation (subject_id, created_at desc);

create table health_share_scope (
  subject_id uuid not null references care_subject on delete cascade,
  metric text not null,
  level text not null default 'observations'
    check (level in ('readings','observations','status')),
  set_by uuid references family_member,
  updated_at timestamptz not null default now(),
  primary key (subject_id, metric)
);

-- Linked device-cloud accounts (Withings first). Tokens live in `access`;
-- service paths only — no app-role grants, no policies, like record_embedding.
create table health_source_link (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references care_subject on delete cascade,
  provider text not null check (provider in ('withings')),
  external_user_id text not null,
  access jsonb,                                    -- oauth tokens; never leaves service paths
  status text not null default 'active' check (status in ('active','revoked','error')),
  created_at timestamptz not null default now(),
  unique (provider, external_user_id)
);
create index idx_hlink_subject on health_source_link (subject_id);

-- ---------- helpers ----------

-- The per-metric dial; absent row = the calm default.
create or replace function health_share_level(subject uuid, p_metric text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select level from health_share_scope
       where subject_id = subject and metric = p_metric),
    'observations')
$$;

-- Holding health access via either consent path (members read health at
-- medical_private, caregivers at caregiver_visible; admins and the person
-- themselves by role).
create or replace function can_read_health(subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_read_level(subject, 'medical_private')
      or can_read_level(subject, 'caregiver_visible')
$$;

-- ---------- verb grants ----------

grant select, insert on health_reading to kinos_app;     -- append-only for users
grant select on health_observation to kinos_app;         -- written by the reducer (service)
grant select, insert, update on health_share_scope to kinos_app;
-- health_source_link: no grants — tokens are service-only.

-- ---------- RLS ----------

alter table health_reading enable row level security;
alter table health_observation enable row level security;
alter table health_share_scope enable row level security;
alter table health_source_link enable row level security;

-- Raw numbers: the person themselves always; whoever entered a reading can
-- see that reading (they already know the number — they typed it, and
-- INSERT ... RETURNING needs the row visible); everyone else needs health
-- consent AND the metric dialled to 'readings'. The dial binds admins too —
-- the centre decides who sees their numbers.
create policy hreading_select on health_reading for select using (
  my_role(subject_ws(subject_id)) = 'care_recipient'
  or member_id = my_member_id(subject_ws(subject_id))
  or (can_read_health(subject_id)
      and health_share_level(subject_id, metric) = 'readings')
);
create policy hreading_insert on health_reading for insert with check (
  my_role(subject_ws(subject_id)) in ('admin','member','caregiver','care_recipient')
);
-- No update/delete grants: readings are append-only for users; the
-- service retention job removes expired rows.

-- Observations: admins and the person by role; everyone else needs health
-- consent and a dial of 'observations' or better. At 'status', the only
-- family-visible trace is the attention event itself.
create policy hobs_select on health_observation for select using (
  my_role(subject_ws(subject_id)) in ('admin','care_recipient')
  or (can_read_health(subject_id)
      and health_share_level(subject_id, metric) in ('readings','observations'))
);

-- The dial: visible to the family, set by the centre or an admin.
create policy hscope_select on health_share_scope for select using (
  is_member(subject_ws(subject_id))
);
create policy hscope_insert on health_share_scope for insert with check (
  my_role(subject_ws(subject_id)) in ('admin','care_recipient')
);
create policy hscope_update on health_share_scope for update using (
  my_role(subject_ws(subject_id)) in ('admin','care_recipient')
);

-- health_source_link: no policies — service role only.
