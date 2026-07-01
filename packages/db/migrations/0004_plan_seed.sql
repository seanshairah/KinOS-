-- Plan catalogue seed. File storage moved to Vercel Blob (see DECISIONS.md);
-- document access is gated by the RLS-guarded `document` rows that hold the
-- blob keys, so no storage-level policies live in the database.

insert into plan (id, name, price_cents, features) values
  ('free', 'Free', 0,
   '["duties","appointments"]'),
  ('family_core', 'Family Core', 800,
   '["daily_brief","medication","appointments","duties","family_record"]'),
  ('family_plus', 'Family Plus', 1900,
   '["daily_brief","medication","appointments","duties","family_record","money_pot","receipts","patterns"]'),
  ('family_premium', 'Family Premium', 3900,
   '["daily_brief","medication","appointments","duties","family_record","money_pot","receipts","patterns","caregiver_access","document_vault"]'),
  ('diaspora_care', 'Diaspora Care', 2200,
   '["daily_brief","medication","appointments","duties","family_record","money_pot","receipts","patterns","caregiver_access","caregiver_proof","cross_border_briefs"]'),
  ('caregiver_pro', 'Caregiver Pro', 4900,
   '["visit_logs","invoices","caregiver_proof","daily_brief"]'),
  ('care_home', 'Care Home', 19900,
   '["resident_dashboards","family_portals","incident_logs","visit_logs","daily_brief"]')
on conflict (id) do nothing;
