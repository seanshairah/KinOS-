import { deviation } from "./baseline";
import { addMinutes } from "./time";
import type { AttentionCandidate, Baseline } from "./types";

/**
 * Health reducer — device and app readings become calm observations, and
 * only a repeated pattern becomes an attention event. The rules mirror the
 * rest of the engine: attention is defined against the person (personal
 * baseline first, wide fallback bands only without history), every event
 * is deduplicated, and the language never diagnoses — "worth a check",
 * never a verdict.
 */

export type HealthMetric =
  | "blood_pressure"
  | "heart_rate"
  | "sleep_minutes"
  | "steps"
  | "weight"
  | "glucose"
  | "spo2";

export interface HealthReading {
  id?: string;
  metric: HealthMetric;
  /** {"systolic":152,"diastolic":94} for blood_pressure, {"value":n} otherwise. */
  value: Record<string, number>;
  takenAt: string; // ISO
}

export interface HealthObservationDraft {
  metric: HealthMetric;
  kind: "drift" | "pattern";
  summary: string;
  detail?: string;
  window?: string;
  readingIds: string[];
}

export interface HealthReduction {
  observation?: HealthObservationDraft;
  attention?: AttentionCandidate;
}

export interface HealthContext {
  subject: { id: string; displayName: string };
  now: Date;
  reading: HealthReading;
  /** Same-metric readings from the last 14 days, excluding `reading`. */
  recent: HealthReading[];
  baseline?: Baseline;
  openAttentionKeys: Set<string>;
}

const PATTERN_WINDOW_DAYS = 8;
const SHORT_NIGHTS_IN_A_ROW = 3;
// Wide fallback bands for when there is no personal history yet. These are
// deliberately generous: without a baseline the engine errs quiet.
const FALLBACK = {
  systolic_high: 150,
  diastolic_high: 95,
  resting_hr_high: 110,
  resting_hr_low: 45,
  sleep_short_minutes: 300,
};

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

function localDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Is this reading outside the person's usual range? */
function isElevated(reading: HealthReading, baseline?: Baseline): boolean {
  switch (reading.metric) {
    case "blood_pressure": {
      const systolic = reading.value.systolic;
      if (typeof systolic !== "number") return false;
      if (baseline) {
        const dev = deviation(baseline, systolic);
        if (dev.reliable) return dev.direction === "above";
      }
      return (
        systolic >= FALLBACK.systolic_high ||
        (reading.value.diastolic ?? 0) >= FALLBACK.diastolic_high
      );
    }
    case "heart_rate": {
      const v = reading.value.value;
      if (typeof v !== "number") return false;
      if (baseline) {
        const dev = deviation(baseline, v);
        if (dev.reliable) return dev.direction !== "within";
      }
      return v >= FALLBACK.resting_hr_high || v <= FALLBACK.resting_hr_low;
    }
    default:
      return false;
  }
}

function metricNoun(metric: HealthMetric): string {
  switch (metric) {
    case "blood_pressure":
      return "Blood pressure";
    case "heart_rate":
      return "Heart rate";
    case "sleep_minutes":
      return "Sleep";
    case "steps":
      return "Movement";
    case "weight":
      return "Weight";
    case "glucose":
      return "Glucose";
    case "spo2":
      return "Oxygen";
  }
}

/**
 * Reduce one fresh reading against its recent history. Returns at most one
 * observation and at most one attention candidate — usually neither: a
 * normal reading is silence.
 */
export function reduceHealthReading(ctx: HealthContext): HealthReduction {
  const { reading, subject, now } = ctx;
  const date = localDate(now);
  const noun = metricNoun(reading.metric);
  const ids = (r: HealthReading[]) =>
    r.map((x) => x.id).filter((x): x is string => Boolean(x));

  // ---- blood pressure & heart rate: the "second mention" rule ----------
  if (reading.metric === "blood_pressure" || reading.metric === "heart_rate") {
    if (!isElevated(reading, ctx.baseline)) return {};

    const priorElevated = ctx.recent.filter(
      (r) =>
        isElevated(r, ctx.baseline) &&
        daysBetween(r.takenAt, reading.takenAt) <= PATTERN_WINDOW_DAYS,
    );

    if (priorElevated.length === 0) {
      // First one: a quiet note. Nobody gets pinged.
      return {
        observation: {
          metric: reading.metric,
          kind: "drift",
          summary: `${noun} was outside ${subject.displayName}'s usual range today.`,
          detail: "One reading on its own is just a note. The orbit is watching.",
          window: `${PATTERN_WINDOW_DAYS}d`,
          readingIds: ids([reading]),
        },
      };
    }

    // Second within the window: the pattern nobody should have to spot in
    // a group chat. This is the moment KinOS exists for.
    const days = Math.max(
      1,
      Math.round(daysBetween(priorElevated[0]!.takenAt, reading.takenAt)),
    );
    const dedupeKey = `health_pattern:${subject.id}:${reading.metric}:${date}`;
    const reduction: HealthReduction = {
      observation: {
        metric: reading.metric,
        kind: "pattern",
        summary: `${noun} — ${
          priorElevated.length + 1 === 2 ? "second" : "repeated"
        } reading outside the usual range in ${days} day${days === 1 ? "" : "s"}.`,
        detail: "Worth a check. Not an emergency.",
        window: `${PATTERN_WINDOW_DAYS}d`,
        readingIds: ids([...priorElevated, reading]),
      },
    };
    if (!ctx.openAttentionKeys.has(dedupeKey)) {
      reduction.attention = {
        subjectId: subject.id,
        kind: "health_pattern",
        severity: "attention",
        title: `${subject.displayName}'s ${noun.toLowerCase()} is worth a check`,
        detail: `Outside the usual range twice in ${days} day${days === 1 ? "" : "s"}. Not an emergency — a check would help.`,
        escalateAt: addMinutes(now, 6 * 60).toISOString(),
        dedupeKey,
      };
    }
    return reduction;
  }

  // ---- sleep: short nights in a row ------------------------------------
  if (reading.metric === "sleep_minutes") {
    const minutes = reading.value.value;
    if (typeof minutes !== "number") return {};
    const short = (m: number) =>
      ctx.baseline && deviation(ctx.baseline, m).reliable
        ? deviation(ctx.baseline, m).direction === "below"
        : m < FALLBACK.sleep_short_minutes;
    if (!short(minutes)) return {};

    const nights = ctx.recent
      .filter((r) => typeof r.value.value === "number")
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
      .slice(0, SHORT_NIGHTS_IN_A_ROW - 1);
    const consecutive =
      nights.length === SHORT_NIGHTS_IN_A_ROW - 1 &&
      nights.every((r) => short(r.value.value!));
    if (!consecutive) return {};

    return {
      observation: {
        metric: reading.metric,
        kind: "pattern",
        summary: `${subject.displayName} has had ${SHORT_NIGHTS_IN_A_ROW} short nights in a row.`,
        detail: "Worth asking how they're sleeping.",
        window: `${SHORT_NIGHTS_IN_A_ROW}d`,
        readingIds: ids([...nights, reading]),
      },
    };
  }

  // ---- steps: quiet drift note (attention is the low_activity rule) ----
  if (reading.metric === "steps") {
    const v = reading.value.value;
    if (typeof v !== "number" || !ctx.baseline) return {};
    const dev = deviation(ctx.baseline, v);
    if (!dev.reliable || dev.direction !== "below") return {};
    return {
      observation: {
        metric: reading.metric,
        kind: "drift",
        summary: `${subject.displayName} moved less than usual today.`,
        window: "1d",
        readingIds: ids([reading]),
      },
    };
  }

  // weight / glucose / spo2: stored and shared per consent; no rules yet.
  return {};
}
