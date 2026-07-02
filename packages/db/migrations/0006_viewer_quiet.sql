-- 0006 — the viewer role becomes what the product promises: a quiet
-- window, nothing more. Reading was always consent-scoped; writing is
-- now closed at the database for every surface a viewer can see.
-- (Without this, a viewer could still add signals, raise attention or
-- emergency alerts, and file record items — enforced only by UI.)

drop policy insert_signal on life_signal;
create policy insert_signal on life_signal for insert
  with check (
    is_member(subject_ws(subject_id))
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy attention_insert on attention_event;
create policy attention_insert on attention_event for insert
  with check (
    is_member(subject_ws(subject_id))
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy attention_update on attention_event;
create policy attention_update on attention_event for update
  using (
    is_member(subject_ws(subject_id))
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy alert_insert on emergency_alert;
create policy alert_insert on emergency_alert for insert
  with check (
    is_member(subject_ws(subject_id))
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy record_insert on family_record_item;
create policy record_insert on family_record_item for insert
  with check (
    can_read_level(subject_id, privacy_level)
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy record_update on family_record_item;
create policy record_update on family_record_item for update
  using (
    (my_role(subject_ws(subject_id)) = 'admin' or can_read_level(subject_id, privacy_level))
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy document_insert on document;
create policy document_insert on document for insert
  with check (
    can_read_level(subject_id, privacy_level)
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy mnote_insert on medical_note;
create policy mnote_insert on medical_note for insert
  with check (
    can_read_level(subject_id, privacy_level)
    and my_role(subject_ws(subject_id)) <> 'viewer'
  );

drop policy activation_insert on activation_event;
create policy activation_insert on activation_event for insert
  with check (
    is_member(workspace_id)
    and my_role(workspace_id) <> 'viewer'
  );
