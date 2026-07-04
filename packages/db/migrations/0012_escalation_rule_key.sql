-- ============================================================
-- One escalation rule per workspace per kind, so the family's quiet-hours
-- and ladder settings upsert cleanly instead of accumulating rows.
-- ============================================================

-- Collapse any accidental duplicates before adding the constraint.
delete from escalation_rule a using escalation_rule b
  where a.workspace_id = b.workspace_id and a.kind = b.kind and a.ctid < b.ctid;

create unique index if not exists idx_escalation_rule_ws_kind
  on escalation_rule (workspace_id, kind);
