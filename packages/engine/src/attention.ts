import { deviation } from "./baseline";
import { addMinutes, daysUntil, hoursBetween, localParts, parseHHMM } from "./time";
import type {
  AttentionCandidate,
  AttentionContext,
  CheckinValue,
  Severity,
} from "./types";

/**
 * Attention engine — the rule set that decides what genuinely cannot be
 * ignored. Every rule is deduplicated by a stable key so re-runs are
 * idempotent, and every rule errs quiet: no reliable evidence, no event.
 * Language stays human — what happened and who acts, never a verdict.
 */

const DOSE_GRACE_MINUTES = 90;
const CHECKIN_GRACE_MINUTES = 60;
const TRANSPORT_WINDOW_HOURS = 36;
const REFILL_WARN_DAYS = 5;
const ESCALATE_AFTER_MINUTES = { watch: 24 * 60, attention: 6 * 60, urgent: 60 };

function esc(now: Date, severity: Severity): string {
  return addMinutes(now, ESCALATE_AFTER_MINUTES[severity]).toISOString();
}

export function runAttentionRules(ctx: AttentionContext): AttentionCandidate[] {
  const out: AttentionCandidate[] = [];
  const push = (c: AttentionCandidate) => {
    if (!ctx.openAttentionKeys.has(c.dedupeKey)) out.push(c);
  };

  const { subject, now } = ctx;
  const local = localParts(now, subject.timezone);

  // ---- missed dose ----------------------------------------------------
  for (const med of ctx.medications) {
    if (!med.active) continue;
    for (const time of med.times) {
      const scheduledMin = parseHHMM(time);
      if (local.minutesOfDay < scheduledMin + DOSE_GRACE_MINUTES) continue;
      const covered = ctx.doseLogs.some((d) => {
        if (d.medicationId !== med.id) return false;
        const dLocal = localParts(new Date(d.at), subject.timezone);
        return (
          dLocal.date === local.date &&
          Math.abs(dLocal.minutesOfDay - scheduledMin) <= 4 * 60
        );
      });
      if (!covered) {
        push({
          subjectId: subject.id,
          kind: "missed_dose",
          severity: "attention",
          title: `${subject.displayName}'s ${time} ${med.name} is still open`,
          detail: med.dose ? `${med.name} · ${med.dose}` : med.name,
          escalateAt: esc(now, "attention"),
          dedupeKey: `missed_dose:${med.id}:${local.date}:${time}`,
        });
      }
    }
  }

  // ---- missed check-in -------------------------------------------------
  if (subject.expectedCheckinBy) {
    const expectedMin = parseHHMM(subject.expectedCheckinBy);
    const checkedInToday = ctx.recentSignals.some(
      (s) =>
        s.signalType === "checkin" &&
        localParts(new Date(s.occurredAt), subject.timezone).date === local.date,
    );
    if (
      !checkedInToday &&
      local.minutesOfDay >= expectedMin + CHECKIN_GRACE_MINUTES
    ) {
      push({
        subjectId: subject.id,
        kind: "missed_checkin",
        severity: "attention",
        title: `No check-in from ${subject.displayName} yet today`,
        detail: `Usually checked in by ${subject.expectedCheckinBy}. Worth a call.`,
        escalateAt: esc(now, "attention"),
        dedupeKey: `missed_checkin:${subject.id}:${local.date}`,
      });
    }
  }

  // ---- transport unconfirmed --------------------------------------------
  for (const appt of ctx.appointments) {
    const startsAt = new Date(appt.startsAt);
    if (startsAt <= now) continue;
    const hoursAway = hoursBetween(now, startsAt);
    if (hoursAway <= TRANSPORT_WINDOW_HOURS && !appt.transportConfirmed) {
      const who = appt.transportOwnerName
        ? `${appt.transportOwnerName} hasn't confirmed transport`
        : "No one is assigned to transport";
      push({
        subjectId: subject.id,
        kind: "transport_unconfirmed",
        severity: hoursAway <= 12 ? "urgent" : "attention",
        title: `Transport not confirmed for ${appt.title}`,
        detail: `${who} · ${appt.location ?? "location TBC"}`,
        ownerMemberId: appt.transportOwnerMemberId ?? null,
        escalateAt: esc(now, hoursAway <= 12 ? "urgent" : "attention"),
        dedupeKey: `transport_unconfirmed:${appt.id}`,
      });
    }
  }

  // ---- medication refill due ---------------------------------------------
  for (const med of ctx.medications) {
    if (!med.active || !med.refillAt) continue;
    const days = daysUntil(med.refillAt, now);
    if (days <= REFILL_WARN_DAYS && days >= -1) {
      const when =
        days <= 0 ? "is due now" : days === 1 ? "is due tomorrow" : `is due in ${days} days`;
      push({
        subjectId: subject.id,
        kind: "medication_refill_due",
        severity: days <= 1 ? "attention" : "watch",
        title: `${med.name} refill ${when}`,
        escalateAt: esc(now, days <= 1 ? "attention" : "watch"),
        dedupeKey: `medication_refill_due:${med.id}:${med.refillAt}`,
      });
    }
  }

  // ---- duty overdue ---------------------------------------------------
  for (const duty of ctx.duties) {
    if (duty.status !== "open" || !duty.dueAt) continue;
    if (new Date(duty.dueAt) < now) {
      push({
        subjectId: subject.id,
        kind: "duty_overdue",
        severity: duty.priority === "high" ? "attention" : "watch",
        title: `"${duty.title}" is past due`,
        detail: duty.ownerName ? `Owner: ${duty.ownerName}` : "No owner assigned",
        ownerMemberId: duty.ownerMemberId ?? null,
        escalateAt: esc(now, duty.priority === "high" ? "attention" : "watch"),
        dedupeKey: `duty_overdue:${duty.id}`,
      });
    }
  }

  // ---- no caregiver visit -------------------------------------------------
  if (subject.expectedVisitEveryHours) {
    const lastVisit = ctx.caregiverVisits
      .map((v) => v.checkIn)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1);
    const hoursSince = lastVisit
      ? hoursBetween(new Date(lastVisit), now)
      : Number.POSITIVE_INFINITY;
    if (hoursSince > subject.expectedVisitEveryHours) {
      push({
        subjectId: subject.id,
        kind: "no_caregiver_visit",
        severity: "attention",
        title: `No caregiver visit logged for ${subject.displayName}`,
        detail: lastVisit
          ? `Last visit was ${Math.floor(hoursSince)} hours ago`
          : "No visits on record yet",
        escalateAt: esc(now, "attention"),
        dedupeKey: `no_caregiver_visit:${subject.id}:${local.date}`,
      });
    }
  }

  // ---- repeated symptom (from interpretations) ---------------------------
  const symptomCounts = new Map<string, number>();
  for (const i of ctx.interpretations) {
    if (i.label.startsWith("symptom:") && i.confidence >= 0.5) {
      symptomCounts.set(i.label, (symptomCounts.get(i.label) ?? 0) + 1);
    }
  }
  for (const [label, count] of symptomCounts) {
    if (count >= 2) {
      const symptom = label.slice("symptom:".length).replace(/_/g, " ");
      push({
        subjectId: subject.id,
        kind: "repeated_symptom",
        severity: "watch",
        title: `${symptom} has come up ${count} times recently`,
        detail: "Worth a check at the next visit.",
        escalateAt: esc(now, "watch"),
        dedupeKey: `repeated_symptom:${subject.id}:${label}:${local.date}`,
      });
    }
  }

  // ---- personal-baseline deviations (sleep, activity) ---------------------
  for (const metric of ["sleep_minutes", "steps"] as const) {
    const baseline = ctx.baselines.find(
      (b) => b.metric === metric && b.window === "14d",
    );
    if (!baseline) continue;
    const latest = ctx.recentSignals
      .filter(
        (s) =>
          s.signalType === "metric" &&
          typeof s.value === "object" &&
          s.value !== null &&
          (s.value as { metric?: string }).metric === metric,
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
    if (!latest) continue;
    const value = (latest.value as { value: number }).value;
    const dev = deviation(baseline, value);
    if (dev.reliable && dev.direction === "below") {
      const noun = metric === "sleep_minutes" ? "Sleep" : "Movement";
      push({
        subjectId: subject.id,
        kind: "low_activity",
        severity: "watch",
        title: `${noun} was lower than ${subject.displayName}'s usual week`,
        detail: "Not alarming on its own — worth a check.",
        sourceSignalId: latest.id,
        escalateAt: esc(now, "watch"),
        dedupeKey: `low_activity:${subject.id}:${metric}:${local.date}`,
      });
    }
  }

  // ---- unwell check-in -------------------------------------------------
  const todaysCheckins = ctx.recentSignals.filter(
    (s) =>
      s.signalType === "checkin" &&
      localParts(new Date(s.occurredAt), subject.timezone).date === local.date,
  );
  for (const c of todaysCheckins) {
    const v = c.value as CheckinValue | null;
    if (v?.mood === "unwell" || (typeof v?.pain === "number" && v.pain >= 7)) {
      push({
        subjectId: subject.id,
        kind: "worth_a_check",
        severity: "attention",
        title: `${subject.displayName} reported feeling unwell`,
        detail: v.note ? `"${v.note}"` : "From today's check-in. A call would help.",
        sourceSignalId: c.id,
        escalateAt: esc(now, "attention"),
        dedupeKey: `worth_a_check:${subject.id}:${local.date}`,
      });
    }
  }

  return out;
}
