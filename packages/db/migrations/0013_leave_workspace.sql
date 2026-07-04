-- ============================================================
-- Leaving a family space, on your own.
--
-- Anyone may step out of a family space without an admin removing them —
-- the counterpart to workspace deletion. One guard: the last admin can't
-- leave while others remain (that would orphan the space); they must first
-- make someone else an admin, or delete the space outright.
--
-- A departing member's row is deleted, which cascades their consent grants,
-- notifications and push subscriptions. Their fingerprints on shared work
-- (duties owned, appointments driven, notes written) are unassigned rather
-- than erased — the family keeps its history; the work simply loses an owner
-- for an admin to pick back up. access_log carries no FK, so the record of
-- the departure survives it.
-- ============================================================

create or replace function leave_workspace(ws uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := my_member_id(ws);
  admin_count int;
begin
  if me is null then
    raise exception 'you are not a member of this family space';
  end if;

  if my_role(ws) = 'admin' then
    select count(*) into admin_count
      from family_member where workspace_id = ws and role = 'admin';
    if admin_count <= 1 and exists (
      select 1 from family_member where workspace_id = ws and id <> me
    ) then
      raise exception 'make another member an admin before you leave, or delete the space';
    end if;
  end if;

  insert into access_log (workspace_id, actor_member_id, action, target)
    values (ws, me, 'left_workspace',
            (select display_name from family_member where id = me));

  -- Unassign shared work this member owned, so no foreign key blocks the exit
  -- and the history stays intact.
  update duty set owner_member_id = null where owner_member_id = me;
  update duty set created_by = null where created_by = me;
  update attention_event set owner_member_id = null where owner_member_id = me;
  update appointment set transport_owner_member_id = null where transport_owner_member_id = me;
  update caregiver_visit set caregiver_member_id = null where caregiver_member_id = me;
  update life_signal set member_id = null where member_id = me;
  update dose_log set member_id = null where member_id = me;
  update medical_note set author_member_id = null where author_member_id = me;
  update contribution set member_id = null where member_id = me;
  update expense set member_id = null where member_id = me;
  update family_record_item set author_member_id = null where author_member_id = me;
  update decision_log set decided_by = null where decided_by = me;
  update emergency_alert set raised_by = null where raised_by = me;
  update consent_grant set granted_by = null where granted_by = me;
  update invitation set invited_by = null where invited_by = me;

  delete from family_member where id = me;
end $$;

grant execute on function leave_workspace(uuid) to kinos_app;
