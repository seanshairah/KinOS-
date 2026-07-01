/**
 * Row types mirroring packages/db/migrations — the reviewed, committed
 * contract the app compiles against. The data layer queries through
 * `withUser` (RLS-enforced) and maps results onto these shapes.
 */

export type Role =
  | "admin"
  | "member"
  | "caregiver"
  | "care_recipient"
  | "viewer"
  | "emergency";

export type PrivacyLevel =
  | "family"
  | "admin_only"
  | "caregiver_visible"
  | "medical_private";

export type ConsentScope = "health" | "money" | "documents" | "location" | "full";
export type SubjectKind = "elder" | "child" | "recovery" | "disability" | "self";
export type AttentionStatus = "open" | "ack" | "resolved" | "snoozed";
export type Severity = "watch" | "attention" | "urgent";
export type DutyStatus = "open" | "done" | "late" | "reassigned";
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface AppUserRow {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: string | null;
  image: string | null;
  created_at: string;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  created_by: string | null;
  plan_id: string;
  created_at: string;
}

export interface MemberRow {
  id: string;
  workspace_id: string;
  user_id: string | null;
  display_name: string | null;
  role: Role;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  workspace_id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  scopes: ConsentScope[];
  invited_by: string | null;
  expires_at: string;
  created_at: string;
}

export interface ConsentGrantRow {
  id: string;
  subject_id: string;
  grantee_member_id: string;
  scope: ConsentScope;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface AccessLogRow {
  id: string;
  workspace_id: string | null;
  actor_member_id: string | null;
  action: string;
  target: string | null;
  at: string;
}

export interface CareSubjectRow {
  id: string;
  workspace_id: string;
  display_name: string;
  kind: SubjectKind | null;
  avatar_url: string | null;
  timezone: string;
  expected_checkin_by: string | null;
  expected_visit_every_hours: number | null;
  created_at: string;
}

export interface EmergencyProfileRow {
  subject_id: string;
  blood_type: string | null;
  conditions: string[];
  allergies: string[];
  medications: string[];
  instructions: string | null;
  share_location: boolean;
  updated_at: string;
}

export interface EmergencyContactRow {
  id: string;
  subject_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  priority: number;
  created_at: string;
}

export interface LifeSignalRow {
  id: string;
  subject_id: string;
  member_id: string | null;
  signal_type: string;
  source: string;
  value: Json;
  unit: string | null;
  privacy_level: PrivacyLevel;
  occurred_at: string;
  raw: Json;
  created_at: string;
}

export interface SignalInterpretationRow {
  id: string;
  signal_id: string;
  label: string;
  confidence: number | null;
  extracted: Json;
  model: string | null;
  created_at: string;
}

export interface BaselineMetricRow {
  subject_id: string;
  metric: string;
  window: string;
  mean: number | null;
  stddev: number | null;
  n: number;
  updated_at: string;
}

export interface AttentionEventRow {
  id: string;
  subject_id: string;
  kind: string;
  severity: Severity;
  title: string;
  detail: string | null;
  status: AttentionStatus;
  owner_member_id: string | null;
  escalate_at: string | null;
  resolved_at: string | null;
  source_signal_id: string | null;
  dedupe_key: string | null;
  created_at: string;
}

export interface PatternRow {
  id: string;
  subject_id: string;
  metric: string;
  direction: "up" | "down" | "steady" | "irregular";
  summary: string;
  window: string;
  at: string;
}

export interface DutyRow {
  id: string;
  subject_id: string;
  title: string;
  note: string | null;
  owner_member_id: string | null;
  due_at: string | null;
  priority: "low" | "normal" | "high";
  status: DutyStatus;
  proof_url: string | null;
  recurrence: Json;
  escalate_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MedicationRow {
  id: string;
  subject_id: string;
  name: string;
  dose: string | null;
  schedule: { times: string[] };
  refill_at: string | null;
  active: boolean;
  created_at: string;
}

export interface DoseLogRow {
  id: string;
  medication_id: string;
  subject_id: string;
  status: "taken" | "missed" | "skipped";
  scheduled_for: string | null;
  at: string;
  member_id: string | null;
}

export interface AppointmentRow {
  id: string;
  subject_id: string;
  kind: "clinic" | "school" | "transport" | "family_call" | "refill" | "other";
  title: string;
  location: string | null;
  starts_at: string;
  transport_owner_member_id: string | null;
  transport_confirmed: boolean;
  notes: string | null;
  created_at: string;
}

export interface CaregiverVisitRow {
  id: string;
  subject_id: string;
  caregiver_member_id: string | null;
  check_in: string | null;
  check_out: string | null;
  tasks: Json;
  notes: string | null;
  evidence_url: string | null;
  created_at: string;
}

export interface MoneyPotRow {
  id: string;
  workspace_id: string;
  subject_id: string | null;
  name: string;
  currency: string;
  balance: number;
  created_at: string;
}

export interface ContributionRow {
  id: string;
  pot_id: string;
  member_id: string | null;
  amount: number;
  currency: string;
  note: string | null;
  payment_intent_id: string | null;
  at: string;
}

export interface ExpenseRow {
  id: string;
  pot_id: string;
  member_id: string | null;
  amount: number;
  currency: string;
  category: string;
  note: string | null;
  receipt_url: string | null;
  at: string;
}

export interface LedgerEntryRow {
  id: string;
  pot_id: string;
  ref_type: "contribution" | "expense" | "reimbursement" | "adjustment";
  ref_id: string | null;
  debit: number;
  credit: number;
  at: string;
}

export interface PaymentIntentRow {
  id: string;
  workspace_id: string;
  pot_id: string | null;
  provider: "stripe" | "paynow";
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  external_id: string | null;
  idempotency_key: string | null;
  meta: Json;
  at: string;
}

export interface FamilyRecordItemRow {
  id: string;
  subject_id: string;
  kind: "note" | "document" | "decision" | "incident" | "question" | "summary";
  title: string;
  body: string | null;
  privacy_level: PrivacyLevel;
  author_member_id: string | null;
  at: string;
}

export interface DocumentRow {
  id: string;
  subject_id: string;
  record_item_id: string | null;
  storage_path: string;
  mime: string | null;
  title: string | null;
  privacy_level: PrivacyLevel;
  created_at: string;
}

export interface DecisionLogRow {
  id: string;
  subject_id: string;
  summary: string;
  decided_by: string | null;
  at: string;
}

export interface DailyBriefRow {
  id: string;
  subject_id: string;
  kind:
    | "morning"
    | "evening"
    | "weekly"
    | "money"
    | "caregiver"
    | "school"
    | "health_pattern";
  body: string;
  actions: Json;
  for_date: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  member_id: string;
  channel: "push" | "email" | "whatsapp" | "in_app";
  title: string;
  body: string | null;
  link: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  read_at: string | null;
  sent_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  member_id: string;
  endpoint: string;
  keys: Json;
  created_at: string;
}

export interface EscalationRuleRow {
  id: string;
  workspace_id: string;
  kind: string;
  ladder: Json;
  quiet_hours: Json;
  created_at: string;
}

export interface EmergencyAlertRow {
  id: string;
  subject_id: string;
  raised_by: string | null;
  at: string;
  contacts_notified: Json;
  response_ms: number | null;
  resolved_at: string | null;
  note: string | null;
}

export interface PlanRow {
  id: string;
  name: string;
  price_cents: number;
  features: Json;
}

export interface SubscriptionRow {
  id: string;
  workspace_id: string;
  plan_id: string;
  provider: "stripe" | "paynow" | null;
  status: "active" | "trialing" | "past_due" | "cancelled";
  external_id: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface UsageLimitRow {
  workspace_id: string;
  key: string;
  used: number;
  cap: number | null;
}

export interface ActivationEventRow {
  id: string;
  workspace_id: string;
  step:
    | "workspace_created"
    | "orbit_created"
    | "member_added"
    | "first_checkin"
    | "first_duty"
    | "first_brief";
  at: string;
}
