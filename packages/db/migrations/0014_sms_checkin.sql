-- ============================================================
-- The no-app check-in. The person at the centre of an Orbit is often the
-- least likely to open an app — so KinOS can ask by text and understand a
-- one-word reply. The subject's own phone lives on care_subject (it belongs
-- to the person being cared for, not to any member), and a date stamp keeps
-- the daily ask idempotent across the 15-minute sweep.
-- ============================================================

alter table care_subject add column if not exists phone text;
alter table care_subject add column if not exists sms_checkin boolean not null default false;
alter table care_subject add column if not exists last_sms_prompt_on date;

-- Inbound replies are matched by sender number.
create index if not exists idx_care_subject_phone on care_subject (phone) where phone is not null;
