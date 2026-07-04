-- ============================================================
-- Reaching people where they are. A member can carry a phone number
-- (for WhatsApp and SMS) and choose which channels reach them. The
-- person being cared for is met on their own terms; nobody is forced
-- onto a channel they didn't pick.
-- ============================================================

alter table family_member add column if not exists phone text;
alter table family_member add column if not exists channel_prefs jsonb not null
  default '{"push":true,"email":true,"whatsapp":true,"sms":false}';

-- Members already update their own row under RLS (member_update: user_id =
-- app_user_id()), so no new grants are needed to set phone or preferences.
