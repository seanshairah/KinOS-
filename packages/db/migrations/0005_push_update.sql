-- Push subscriptions are upserted on re-registration (same device, fresh
-- keys). The original grants covered insert/delete but not the update arm
-- of "on conflict … do update" — registering twice from the same device
-- failed. Members may update only their own device rows.

grant update on push_subscription to kinos_app;

create policy push_update on push_subscription for update
  using (member_id in (select m.id from family_member m where m.user_id = app_user_id()))
  with check (member_id in (select m.id from family_member m where m.user_id = app_user_id()));
