/**
 * Family Rhythm — the shape of ordinary weeks, said out loud.
 *
 * Check-in hour, medication completion, caregiver days, spending cadence:
 * each line describes the person's own usual, and whether this week sits
 * inside it. Change is noted as a shift in rhythm, never a finding —
 * noticing is the family's job; KinOS only holds up the mirror.
 */

export interface RhythmInputs {
  subjectName: string;
  timezone: string;
  /** Local hour (0–23) of each check-in over the window, newest last. */
  checkinHours: number[];
  /** Doses taken vs. scheduled over the window. */
  dosesTaken: number;
  dosesScheduled: number;
  /** Local weekday names of caregiver visits over the window, e.g. ["Tue","Fri"]. */
  visitWeekdays: string[];
  /** Expenses per week over the window, oldest first, e.g. [3, 2, 4]. */
  weeklySpendCounts: number[];
}

export interface RhythmLine {
  topic: "checkin" | "medication" | "visits" | "money";
  text: string;
  /** steady = inside their usual; shifting = the rhythm moved this week. */
  state: "steady" | "shifting";
}

export function composeFamilyRhythm(inputs: RhythmInputs): RhythmLine[] {
  const lines: RhythmLine[] = [];
  const name = inputs.subjectName;

  // — check-ins: the usual hour, and whether this week drifted —
  if (inputs.checkinHours.length >= 3) {
    const usual = median(inputs.checkinHours.slice(0, -3));
    const recent = median(inputs.checkinHours.slice(-3));
    const usualLabel = hourLabel(usual ?? recent!);
    if (usual == null || Math.abs(recent! - usual) < 2) {
      lines.push({
        topic: "checkin",
        state: "steady",
        text: `${name} usually checks in around ${usualLabel}, and still does.`,
      });
    } else {
      lines.push({
        topic: "checkin",
        state: "shifting",
        text: `${name} usually checks in around ${usualLabel} — lately it's nearer ${hourLabel(recent!)}. A shift in rhythm, worth nothing more than noticing.`,
      });
    }
  }

  // — medication: completion as a rhythm, not a scoreboard —
  if (inputs.dosesScheduled > 0) {
    const rate = inputs.dosesTaken / inputs.dosesScheduled;
    if (rate >= 0.9) {
      lines.push({
        topic: "medication",
        state: "steady",
        text: `Medication has its rhythm — ${inputs.dosesTaken} of ${inputs.dosesScheduled} doses taken this window.`,
      });
    } else {
      lines.push({
        topic: "medication",
        state: "shifting",
        text: `Doses are landing less regularly — ${inputs.dosesTaken} of ${inputs.dosesScheduled} this window. Worth a gentle look at what changed.`,
      });
    }
  }

  // — caregiver visits: the usual days —
  if (inputs.visitWeekdays.length > 0) {
    const days = [...new Set(inputs.visitWeekdays)];
    lines.push({
      topic: "visits",
      state: "steady",
      text: `Caregiver visits usually land on ${days.join(" and ")}.`,
    });
  }

  // — money: cadence, not amounts —
  if (inputs.weeklySpendCounts.length >= 2) {
    const prior = inputs.weeklySpendCounts.slice(0, -1);
    const usual = prior.reduce((a, b) => a + b, 0) / prior.length;
    const latest = inputs.weeklySpendCounts[inputs.weeklySpendCounts.length - 1]!;
    if (usual > 0 && latest >= usual * 2 && latest - usual >= 2) {
      lines.push({
        topic: "money",
        state: "shifting",
        text: `Spending moved more often than usual this week (${latest} entries against a usual ${Math.round(usual)}).`,
      });
    } else {
      lines.push({
        topic: "money",
        state: "steady",
        text: `Care spending keeps its usual pace.`,
      });
    }
  }

  return lines;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function hourLabel(hour: number): string {
  const h = Math.round(hour) % 24;
  return `${String(h).padStart(2, "0")}:00`;
}
