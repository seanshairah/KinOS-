import { z } from "zod";
import {
  checkinValueSchema,
  metricValueSchema,
  PRIVACY_LEVELS,
  SIGNAL_SOURCES,
  SIGNAL_TYPES,
  type PrivacyLevel,
  type SignalSource,
  type SignalType,
} from "./types";

/**
 * Normalization: every capture becomes a well-formed Life Signal or is
 * rejected with a reason. Boundary validation happens here once, so the
 * rest of the pipeline can trust its input.
 */

export const rawCaptureSchema = z.object({
  subjectId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  signalType: z.enum(SIGNAL_TYPES),
  source: z.enum(SIGNAL_SOURCES),
  value: z.unknown().optional(),
  unit: z.string().max(24).optional(),
  privacyLevel: z.enum(PRIVACY_LEVELS).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});
export type RawCapture = z.infer<typeof rawCaptureSchema>;

export interface NormalizedSignal {
  subjectId: string;
  memberId?: string;
  signalType: SignalType;
  source: SignalSource;
  value: unknown;
  unit?: string;
  privacyLevel: PrivacyLevel;
  occurredAt: string;
}

export type NormalizeResult =
  | { ok: true; signal: NormalizedSignal }
  | { ok: false; reason: string };

/** Default privacy per signal type — the safe end of each spectrum. */
const DEFAULT_PRIVACY: Record<SignalType, PrivacyLevel> = {
  checkin: "family",
  voice_note: "caregiver_visible",
  receipt: "family",
  document: "family",
  metric: "medical_private",
  appointment: "family",
  duty_update: "family",
  expense: "family",
  caregiver_visit: "caregiver_visible",
  emergency: "family",
  medication_dose: "caregiver_visible",
  wearable: "medical_private",
};

export function normalizeCapture(input: unknown, now: Date): NormalizeResult {
  const parsed = rawCaptureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  const raw = parsed.data;

  // Type-specific payload validation.
  if (raw.signalType === "checkin") {
    const v = checkinValueSchema.safeParse(raw.value);
    if (!v.success) return { ok: false, reason: "check-in payload malformed" };
  }
  if (raw.signalType === "metric") {
    const v = metricValueSchema.safeParse(raw.value);
    if (!v.success) return { ok: false, reason: "metric payload malformed" };
  }

  const occurredAt = raw.occurredAt ?? now.toISOString();
  if (new Date(occurredAt).getTime() > now.getTime() + 5 * 60_000) {
    return { ok: false, reason: "signal timestamped in the future" };
  }

  return {
    ok: true,
    signal: {
      subjectId: raw.subjectId,
      memberId: raw.memberId,
      signalType: raw.signalType,
      source: raw.source,
      value: raw.value ?? null,
      unit: raw.unit,
      privacyLevel: raw.privacyLevel ?? DEFAULT_PRIVACY[raw.signalType],
      occurredAt,
    },
  };
}
