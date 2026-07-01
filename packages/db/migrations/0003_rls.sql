-- ============================================================
-- Row-Level Security: consent enforced in the database.
--
-- The app executes user queries as role `kinos_app` (SET LOCAL ROLE) with
-- the authenticated user in `app.user_id`. Deny by default: kinos_app has
-- no grant it isn't given here, and no row it isn't policied into.
-- Nothing is readable without a membership row, a role that permits the
-- privacy level, and — for elevated levels — an active consent grant.
-- Revoking consent blocks in-query, immediately.
-- ============================================================

-- ---------- helpers ----------

-- Which privacy levels a role may read.
create or replace function role_visible_levels(r text) returns text[]
language sql immutable as $$
  select case r
    when 'admin'          then array['family','admin_only','caregiver_visible','medical_private']
    when 'member'         then array['family','medical_private']
    when 'caregiver'      then array['family','caregiver_visible']
    when 'care_recipient' then array['family','caregiver_visible','medical_private']
    when 'viewer'         then array['family']
    when 'emergency'      then array['family']
    else array[]::text[]
  end
$$;

-- Which consent scopes unlock a privacy level (beyond 'family').
create or replace function level_required_scopes(level text) returns text[]
language sql immutable as $$
  select case level
    when 'medical_private'   then array['health','full']
    when 'caregiver_visible' then array['health','full']
    when 'admin_only'        then array['full']
    else array[]::text[]
  end
$$;

-- security definer: helpers read membership rows regardless of the
-- caller's row visibility, avoiding policy recursion.
create or replace function is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_member m
    where m.workspace_id = ws and m.user_id = app_user_id()
  )
$$;

create or replace function my_role(ws uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from family_member m
  where m.workspace_id = ws and m.user_id = app_user_id()
  limit 1
$$;

create or replace function my_member_id(ws uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from family_member m
  where m.workspace_id = ws and m.user_id = app_user_id()
  limit 1
$$;

create or replace function subject_ws(subject uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select s.workspace_id from care_subject s where s.id = subject
$$;

-- Does the current user hold an active consent grant on this subject
-- for any of the given scopes?
create or replace function has_consent(subject uuid, scopes text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from consent_grant g
    join family_member m on m.id = g.grantee_member_id
    where g.subject_id = subject
      and m.user_id = app_user_id()
      and g.scope = any (scopes)
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > now())
  )
$$;

-- The core gate: workspace membership + role level + (family OR consent).
-- Admins and the care recipient themselves do not need a grant.
create or replace function can_read_level(subject uuid, level text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not is_member(subject_ws(subject)) then false
    when not (level = any (role_visible_levels(my_role(subject_ws(subject))))) then false
    when level = 'family' then true
    when my_role(subject_ws(subject)) in ('admin','care_recipient') then true
    else has_consent(subject, level_required_scopes(level))
  end
$$;

-- Money visibility: admins and members by role; anyone else via a
-- money/full consent grant on the pot's subject.
create or replace function can_read_money(ws uuid, subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not is_member(ws) then false
    when my_role(ws) in ('admin','member') then true
    when subject is not null then has_consent(subject, array['money','full'])
    else false
  end
$$;

-- ---------- verb grants for the app role ----------
-- (RLS restricts rows; these grants restrict verbs. No grant = no access.)

grant select, insert, update on family_workspace to kinos_app;
grant select, insert, update, delete on family_member to kinos_app;
grant select, insert, update on invitation to kinos_app;
grant select, insert, update on consent_grant to kinos_app;
grant select, insert on access_log to kinos_app;
grant select, insert, update, delete on care_subject to kinos_app;
grant select, insert, update on emergency_profile to kinos_app;
grant select, insert, update, delete on emergency_contact to kinos_app;
grant select, insert on medical_note to kinos_app;
grant select, insert on life_signal to kinos_app;          -- append-only
grant select on signal_interpretation to kinos_app;
grant select on baseline_metric to kinos_app;
grant select, insert, update on attention_event to kinos_app;
grant select on pattern to kinos_app;
grant select, insert, update on duty to kinos_app;
grant select, insert, update on medication to kinos_app;
grant select, insert on dose_log to kinos_app;
grant select, insert, update on appointment to kinos_app;
grant select, insert, update on caregiver_visit to kinos_app;
grant select, insert, update on money_pot to kinos_app;
grant select on contribution to kinos_app;
grant select on expense to kinos_app;
grant select on ledger_entry to kinos_app;
grant select on payment_intent to kinos_app;
grant select, insert, update on family_record_item to kinos_app;
grant select, insert on document to kinos_app;
grant select, insert on decision_log to kinos_app;
grant select on daily_brief to kinos_app;
grant select, update on notification to kinos_app;
grant select, insert, delete on push_subscription to kinos_app;
grant select, insert, update on escalation_rule to kinos_app;
grant select, insert, update on emergency_alert to kinos_app;
grant select on plan to kinos_app;
grant select on subscription to kinos_app;
grant select on usage_limit to kinos_app;
grant select, insert on activation_event to kinos_app;
-- record_embedding, pipeline_dead_letter: no grants — service paths only.

-- ---------- enable RLS everywhere ----------

alter table family_workspace enable row level security;
alter table family_member enable row level security;
alter table invitation enable row level security;
alter table consent_grant enable row level security;
alter table access_log enable row level security;
alter table care_subject enable row level security;
alter table emergency_profile enable row level security;
alter table emergency_contact enable row level security;
alter table medical_note enable row level security;
alter table life_signal enable row level security;
alter table signal_interpretation enable row level security;
alter table baseline_metric enable row level security;
alter table attention_event enable row level security;
alter table pattern enable row level security;
alter table pipeline_dead_letter enable row level security;
alter table duty enable row level security;
alter table medication enable row level security;
alter table dose_log enable row level security;
alter table appointment enable row level security;
alter table caregiver_visit enable row level security;
alter table money_pot enable row level security;
alter table contribution enable row level security;
alter table expense enable row level security;
alter table ledger_entry enable row level security;
alter table payment_intent enable row level security;
alter table family_record_item enable row level security;
alter table document enable row level security;
alter table decision_log enable row level security;
alter table record_embedding enable row level security;
alter table daily_brief enable row level security;
alter table notification enable row level security;
alter table push_subscription enable row level security;
alter table escalation_rule enable row level security;
alter table emergency_alert enable row level security;
alter table plan enable row level security;
alter table subscription enable row level security;
alter table usage_limit enable row level security;
alter table activation_event enable row level security;

-- ---------- identity & access ----------

create policy ws_select on family_workspace for select
  using (is_member(id));
create policy ws_update on family_workspace for update
  using (my_role(id) = 'admin');

create policy member_select on family_member for select
  using (is_member(workspace_id));
create policy member_insert on family_member for insert
  with check (my_role(workspace_id) = 'admin');
create policy member_update on family_member for update
  using (my_role(workspace_id) = 'admin' or user_id = app_user_id());
create policy member_delete on family_member for delete
  using (my_role(workspace_id) = 'admin');

create policy invitation_select on invitation for select
  using (my_role(workspace_id) = 'admin');
create policy invitation_insert on invitation for insert
  with check (my_role(workspace_id) = 'admin');
create policy invitation_update on invitation for update
  using (my_role(workspace_id) = 'admin');

create policy consent_select on consent_grant for select
  using (is_member(subject_ws(subject_id)));
create policy consent_insert on consent_grant for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','care_recipient'));
create policy consent_update on consent_grant for update
  using (my_role(subject_ws(subject_id)) in ('admin','care_recipient'));

create policy access_log_select on access_log for select
  using (my_role(workspace_id) = 'admin');
create policy access_log_insert on access_log for insert
  with check (is_member(workspace_id));

-- ---------- people / orbits ----------

create policy subject_select on care_subject for select
  using (is_member(workspace_id));
create policy subject_insert on care_subject for insert
  with check (my_role(workspace_id) in ('admin','member'));
create policy subject_update on care_subject for update
  using (my_role(workspace_id) in ('admin','member'));
create policy subject_delete on care_subject for delete
  using (my_role(workspace_id) = 'admin');

-- The Emergency Layer must work for the emergency role by design.
create policy eprofile_select on emergency_profile for select
  using (
    can_read_level(subject_id, 'medical_private')
    or my_role(subject_ws(subject_id)) = 'emergency'
  );
create policy eprofile_write on emergency_profile for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));
create policy eprofile_update on emergency_profile for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));

create policy econtact_select on emergency_contact for select
  using (is_member(subject_ws(subject_id)));
create policy econtact_write on emergency_contact for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member'));
create policy econtact_update on emergency_contact for update
  using (my_role(subject_ws(subject_id)) in ('admin','member'));
create policy econtact_delete on emergency_contact for delete
  using (my_role(subject_ws(subject_id)) in ('admin','member'));

create policy mnote_select on medical_note for select
  using (can_read_level(subject_id, privacy_level));
create policy mnote_insert on medical_note for insert
  with check (can_read_level(subject_id, privacy_level));

-- ---------- the engine ----------

create policy read_signal on life_signal for select
  using (can_read_level(subject_id, privacy_level));
create policy insert_signal on life_signal for insert
  with check (is_member(subject_ws(subject_id)));
-- append-only: no update/delete grants or policies, plus trigger backstop.

-- Interpretations inherit visibility from their signal: the subquery runs
-- under life_signal's own RLS, so an invisible signal hides its rows.
create policy interp_select on signal_interpretation for select
  using (exists (select 1 from life_signal s where s.id = signal_id));

create policy baseline_select on baseline_metric for select
  using (is_member(subject_ws(subject_id)));

create policy attention_select on attention_event for select
  using (is_member(subject_ws(subject_id)));
create policy attention_insert on attention_event for insert
  with check (is_member(subject_ws(subject_id)));
create policy attention_update on attention_event for update
  using (is_member(subject_ws(subject_id)));

create policy pattern_select on pattern for select
  using (is_member(subject_ws(subject_id)));

-- pipeline_dead_letter, record_embedding: no policies — service role only.

-- ---------- care workflow ----------

create policy duty_select on duty for select
  using (is_member(subject_ws(subject_id)));
create policy duty_insert on duty for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','caregiver','care_recipient'));
create policy duty_update on duty for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','caregiver','care_recipient'));

create policy medication_select on medication for select
  using (is_member(subject_ws(subject_id)));
create policy medication_write on medication for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));
create policy medication_update on medication for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','care_recipient'));

create policy dose_select on dose_log for select
  using (is_member(subject_ws(subject_id)));
create policy dose_insert on dose_log for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','caregiver','care_recipient'));

create policy appt_select on appointment for select
  using (is_member(subject_ws(subject_id)));
create policy appt_insert on appointment for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member','caregiver'));
create policy appt_update on appointment for update
  using (my_role(subject_ws(subject_id)) in ('admin','member','caregiver'));

create policy visit_select on caregiver_visit for select
  using (is_member(subject_ws(subject_id)));
create policy visit_insert on caregiver_visit for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','caregiver'));
create policy visit_update on caregiver_visit for update
  using (
    my_role(subject_ws(subject_id)) = 'admin'
    or caregiver_member_id = my_member_id(subject_ws(subject_id))
  );

-- ---------- money ----------

create policy pot_select on money_pot for select
  using (can_read_money(workspace_id, subject_id));
create policy pot_insert on money_pot for insert
  with check (my_role(workspace_id) in ('admin','member'));
create policy pot_update on money_pot for update
  using (my_role(workspace_id) = 'admin');

create policy contribution_select on contribution for select
  using (exists (select 1 from money_pot p where p.id = pot_id));
create policy expense_select on expense for select
  using (
    exists (select 1 from money_pot p where p.id = pot_id)
    or member_id in (select m.id from family_member m where m.user_id = app_user_id())
  );
-- Contribution/expense/ledger writes go through the RPCs below so the
-- double-entry invariant and balance stay consistent.

create policy ledger_select on ledger_entry for select
  using (exists (select 1 from money_pot p where p.id = pot_id
                 and my_role(p.workspace_id) in ('admin','member')));

create policy payment_select on payment_intent for select
  using (my_role(workspace_id) = 'admin');

-- ---------- records & memory ----------

create policy record_select on family_record_item for select
  using (can_read_level(subject_id, privacy_level));
create policy record_insert on family_record_item for insert
  with check (can_read_level(subject_id, privacy_level));
create policy record_update on family_record_item for update
  using (my_role(subject_ws(subject_id)) = 'admin' or can_read_level(subject_id, privacy_level));

create policy document_select on document for select
  using (can_read_level(subject_id, privacy_level));
create policy document_insert on document for insert
  with check (can_read_level(subject_id, privacy_level));

create policy decision_select on decision_log for select
  using (is_member(subject_ws(subject_id)));
create policy decision_insert on decision_log for insert
  with check (my_role(subject_ws(subject_id)) in ('admin','member'));

-- ---------- briefs, alerts, notifications ----------

create policy brief_select on daily_brief for select
  using (is_member(subject_ws(subject_id)));

create policy notification_select on notification for select
  using (member_id in (select m.id from family_member m where m.user_id = app_user_id()));
create policy notification_update on notification for update
  using (member_id in (select m.id from family_member m where m.user_id = app_user_id()));

create policy push_select on push_subscription for select
  using (member_id in (select m.id from family_member m where m.user_id = app_user_id()));
create policy push_insert on push_subscription for insert
  with check (member_id in (select m.id from family_member m where m.user_id = app_user_id()));
create policy push_delete on push_subscription for delete
  using (member_id in (select m.id from family_member m where m.user_id = app_user_id()));

create policy escalation_select on escalation_rule for select
  using (is_member(workspace_id));
create policy escalation_write on escalation_rule for insert
  with check (my_role(workspace_id) = 'admin');
create policy escalation_update on escalation_rule for update
  using (my_role(workspace_id) = 'admin');

create policy alert_select on emergency_alert for select
  using (is_member(subject_ws(subject_id)));
create policy alert_insert on emergency_alert for insert
  with check (is_member(subject_ws(subject_id)));
create policy alert_update on emergency_alert for update
  using (my_role(subject_ws(subject_id)) in ('admin','member'));

-- ---------- business ----------

create policy plan_public_read on plan for select using (true);

create policy subscription_select on subscription for select
  using (my_role(workspace_id) = 'admin');

create policy usage_select on usage_limit for select
  using (is_member(workspace_id));

create policy activation_select on activation_event for select
  using (is_member(workspace_id));
create policy activation_insert on activation_event for insert
  with check (is_member(workspace_id));

-- ============================================================
-- RPCs (security definer): bootstrap + invariant-keeping writes.
-- Owned by the migration (owner) role, so they may cross RLS by design;
-- each performs its own permission checks.
-- ============================================================

-- Create a workspace and its first admin member atomically.
create or replace function create_workspace(ws_name text, member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws_id uuid;
begin
  if app_user_id() is null then
    raise exception 'not authenticated';
  end if;
  insert into family_workspace (name, created_by) values (ws_name, app_user_id())
    returning id into ws_id;
  insert into family_member (workspace_id, user_id, display_name, role)
    values (ws_id, app_user_id(), member_name, 'admin');
  insert into activation_event (workspace_id, step) values (ws_id, 'workspace_created')
    on conflict do nothing;
  return ws_id;
end $$;

-- Accept an invitation: creates the member with the preassigned role and
-- turns the invitation's scopes into consent grants for every Orbit.
create or replace function accept_invitation(invite_token text, member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv invitation%rowtype;
  new_member uuid;
  s record;
  scope_item text;
begin
  if app_user_id() is null then
    raise exception 'not authenticated';
  end if;
  select * into inv from invitation
    where token = invite_token and status = 'pending' and expires_at > now()
    for update;
  if not found then
    raise exception 'invitation is no longer valid';
  end if;
  insert into family_member (workspace_id, user_id, display_name, role)
    values (inv.workspace_id, app_user_id(), member_name, inv.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role
    returning id into new_member;
  foreach scope_item in array inv.scopes loop
    for s in select id from care_subject where workspace_id = inv.workspace_id loop
      insert into consent_grant (subject_id, grantee_member_id, scope, granted_by)
        values (s.id, new_member, scope_item, inv.invited_by);
    end loop;
  end loop;
  update invitation set status = 'accepted' where id = inv.id;
  insert into activation_event (workspace_id, step) values (inv.workspace_id, 'member_added')
    on conflict do nothing;
  return new_member;
end $$;

-- Money Pot writes: contribution and expense keep the ledger and balance
-- consistent in one transaction. Permission checks run inside.
create or replace function record_contribution(
  p_pot uuid, p_amount numeric, p_currency text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pot money_pot%rowtype;
  me uuid;
  contribution_id uuid;
begin
  select * into pot from money_pot where id = p_pot for update;
  if not found then raise exception 'pot not found'; end if;
  me := my_member_id(pot.workspace_id);
  if me is null or my_role(pot.workspace_id) not in ('admin','member') then
    raise exception 'not permitted';
  end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into contribution (pot_id, member_id, amount, currency, note)
    values (p_pot, me, p_amount, p_currency, p_note) returning id into contribution_id;
  insert into ledger_entry (pot_id, ref_type, ref_id, credit)
    values (p_pot, 'contribution', contribution_id, p_amount);
  update money_pot set balance = balance + p_amount where id = p_pot;
  return contribution_id;
end $$;

create or replace function record_expense(
  p_pot uuid, p_amount numeric, p_currency text, p_category text,
  p_note text default null, p_receipt_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pot money_pot%rowtype;
  me uuid;
  expense_id uuid;
begin
  select * into pot from money_pot where id = p_pot for update;
  if not found then raise exception 'pot not found'; end if;
  me := my_member_id(pot.workspace_id);
  if me is null or my_role(pot.workspace_id) not in ('admin','member','caregiver') then
    raise exception 'not permitted';
  end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into expense (pot_id, member_id, amount, currency, category, note, receipt_url)
    values (p_pot, me, p_amount, p_currency, p_category, p_note, p_receipt_url)
    returning id into expense_id;
  insert into ledger_entry (pot_id, ref_type, ref_id, debit)
    values (p_pot, 'expense', expense_id, p_amount);
  update money_pot set balance = balance - p_amount where id = p_pot;
  return expense_id;
end $$;

-- Semantic recall over the Family Record (service paths call this after
-- their own permission check; kinos_app has no execute grant).
create or replace function match_records(
  p_subject uuid, p_embedding vector(1536), p_count int default 6)
returns table (record_item_id uuid, content text, similarity float)
language sql stable security definer set search_path = public as $$
  select e.record_item_id, e.content,
         1 - (e.embedding <=> p_embedding) as similarity
  from record_embedding e
  where e.subject_id = p_subject and e.embedding is not null
  order by e.embedding <=> p_embedding
  limit p_count
$$;

grant execute on function create_workspace(text, text) to kinos_app;
grant execute on function accept_invitation(text, text) to kinos_app;
grant execute on function record_contribution(uuid, numeric, text, text) to kinos_app;
grant execute on function record_expense(uuid, numeric, text, text, text, text) to kinos_app;
revoke execute on function match_records(uuid, vector, int) from public;
