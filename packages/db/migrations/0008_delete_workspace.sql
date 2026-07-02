-- ============================================================
-- Workspace deletion — the exit the Privacy Policy promises.
--
-- One auditable path: a security-definer RPC that checks the caller is
-- an admin of the workspace, writes the audit row, then deletes. Content
-- removal rides the existing ON DELETE CASCADE graph (orbits, signals,
-- health, money, records, briefs, members, invitations, subscriptions).
-- access_log rows carry no FK on purpose, so the audit trail of the
-- deletion survives the deletion itself.
-- ============================================================

create or replace function delete_workspace(ws uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role(ws) is distinct from 'admin' then
    raise exception 'only an admin can delete a family space';
  end if;
  insert into access_log (workspace_id, actor_member_id, action, target)
    values (ws, my_member_id(ws), 'workspace_deleted',
            (select name from family_workspace where id = ws));
  delete from family_workspace where id = ws;
end $$;

grant execute on function delete_workspace(uuid) to kinos_app;
