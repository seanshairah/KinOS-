import { z } from "zod";

/**
 * The engine's shared vocabulary. Framework-agnostic on purpose:
 * the same types drive Edge Functions, server actions, and tests.
 */

export const SIGNAL_TYPES = [
  "checkin",
  "voice_note",
  "receipt",
  "document",
  "metric",
  "appointment",
  "duty_update",
  "expense",
  "caregiver_visit",
  "emergency",
  "medication_dose",
  "wearable",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_SOURCES = [
  "manual_checkin",
  "caregiver_voice_note",
  "receipt_scan",
  "document_upload",
  "manual_metric",
  "system",
  "health_connect",
  "wearable_sync",
] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export const PRIVACY_LEVELS = [
  "family",
  "admin_only",
  "caregiver_visible",
  "medical_private",
] as const;
export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

export const MOODS = ["good", "okay", "low", "unwell"] as const;
export type Mood = (typeof MOODS)[number];

/** Structured check-in payload — the simplest, most important signal. */
export const checkinValueSchema = z.object({
  mood: z.enum(MOODS),
  ate: z.boolean().optional(),
  slept_ok: z.boolean().optional(),
  pain: z.number().min(0).max(10).optional(),
  note: z.string().max(2000).optional(),
});
export type CheckinValue = z.infer<typeof checkinValueSchema>;

export const metricValueSchema = z.object({
  metric: z.enum([
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
    "weight",
    "glucose",
    "mood",
    "pain",
    "appetite",
    "sleep_minutes",
    "steps",
  ]),
  value: z.number(),
  unit: z.string().optional(),
});
export type MetricValue = z.infer<typeof metricValueSchema>;

export interface LifeSignal {
  id: string;
  subjectId: string;
  memberId?: string | null;
  signalType: SignalType;
  source: SignalSource;
  value: unknown;
  unit?: string | null;
  privacyLevel: PrivacyLevel;
  occurredAt: string; // ISO
}

export interface Interpretation {
  signalId: string;
  label: string;
  confidence: number;
  extracted?: Record<string, unknown>;
}

export interface Baseline {
  metric: string;
  window: string; // e.g. "14d"
  mean: number;
  stddev: number;
  n: number;
}

export const ATTENTION_KINDS = [
  "missed_dose",
  "missed_checkin",
  "low_activity",
  "repeated_symptom",
  "medication_refill_due",
  "transport_unconfirmed",
  "bill_due",
  "no_caregiver_visit",
  "duty_overdue",
  "pattern_change",
  "worth_a_check",
] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export type Severity = "watch" | "attention" | "urgent";

export interface AttentionCandidate {
  subjectId: string;
  kind: AttentionKind;
  severity: Severity;
  title: string;
  detail?: string;
  ownerMemberId?: string | null;
  /** ISO timestamp when this escalates a rung up the ladder if unresolved. */
  escalateAt?: string;
  sourceSignalId?: string;
  /** Stable key so re-running rules never duplicates an open event. */
  dedupeKey: string;
}

export interface DutySnapshot {
  id: string;
  subjectId: string;
  title: string;
  ownerMemberId?: string | null;
  ownerName?: string | null;
  dueAt?: string | null;
  status: "open" | "done" | "late" | "reassigned";
  priority: "low" | "normal" | "high";
}

export interface MedicationSnapshot {
  id: string;
  subjectId: string;
  name: string;
  dose?: string | null;
  /** Times of day like "08:00", subject-local. */
  times: string[];
  refillAt?: string | null; // ISO date
  active: boolean;
}

export interface DoseLogSnapshot {
  medicationId: string;
  status: "taken" | "missed" | "skipped";
  scheduledFor?: string | null;
  at: string;
}

export interface AppointmentSnapshot {
  id: string;
  subjectId: string;
  kind: string;
  title: string;
  location?: string | null;
  startsAt: string;
  transportOwnerMemberId?: string | null;
  transportOwnerName?: string | null;
  transportConfirmed: boolean;
}

export interface CaregiverVisitSnapshot {
  subjectId: string;
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface SubjectSnapshot {
  id: string;
  displayName: string;
  kind: "elder" | "child" | "recovery" | "disability" | "self";
  timezone: string;
  /** Expects a caregiver visit at least every N hours; null disables the rule. */
  expectedVisitEveryHours?: number | null;
  /** Expects a daily check-in by this local time, e.g. "11:00". */
  expectedCheckinBy?: string | null;
}

/** Everything the attention rules need to evaluate one subject at one moment. */
export interface AttentionContext {
  subject: SubjectSnapshot;
  now: Date;
  recentSignals: LifeSignal[];
  interpretations: Interpretation[];
  duties: DutySnapshot[];
  medications: MedicationSnapshot[];
  doseLogs: DoseLogSnapshot[];
  appointments: AppointmentSnapshot[];
  caregiverVisits: CaregiverVisitSnapshot[];
  baselines: Baseline[];
  openAttentionKeys: Set<string>;
}
