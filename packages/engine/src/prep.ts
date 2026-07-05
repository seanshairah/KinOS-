/**
 * Tomorrow Prep — the evening question: is tomorrow ready?
 *
 * Walks tomorrow's commitments (appointments, transport, refills, duties,
 * an expected caregiver visit, documents worth carrying) and answers in
 * one calm line, with the specific gaps beneath it. "Tomorrow is ready"
 * is a real answer, earned by checking — not a default.
 */

export interface TomorrowFacts {
  subjectName: string;
  appointments: {
    title: string;
    when: string; // already formatted, subject-local
    transportConfirmed: boolean;
    transportOwnerName?: string | null;
    location?: string | null;
  }[];
  refillsDue: { medicationName: string }[];
  dutiesDue: { title: string; ownerName?: string | null }[];
  caregiverVisitExpected: boolean;
  caregiverVisitPlanned: boolean;
  /** Documents attached to tomorrow's appointments, worth carrying. */
  documentsToCarry: string[];
  /** Present when the pot can't cover tomorrow's known costs. */
  moneyShortNote?: string | null;
}

export interface TomorrowPrep {
  ready: boolean;
  headline: string;
  /** The specific gaps, each one actionable — empty when ready. */
  gaps: string[];
  /** What tomorrow holds, ready or not — for the evening glance. */
  plan: string[];
}

export function composeTomorrowPrep(facts: TomorrowFacts): TomorrowPrep {
  const gaps: string[] = [];
  const plan: string[] = [];

  for (const appt of facts.appointments) {
    plan.push(
      `${appt.title} · ${appt.when}${appt.location ? ` · ${appt.location}` : ""}`,
    );
    if (!appt.transportConfirmed) {
      gaps.push(`Transport for ${appt.title.toLowerCase()} isn't confirmed yet.`);
    }
  }
  for (const refill of facts.refillsDue) {
    plan.push(`${refill.medicationName} refill is due`);
    gaps.push(`${refill.medicationName} needs its refill collected.`);
  }
  for (const duty of facts.dutiesDue) {
    plan.push(`${duty.title}${duty.ownerName ? ` · ${duty.ownerName}` : ""}`);
    if (!duty.ownerName) gaps.push(`“${duty.title}” has no owner yet.`);
  }
  if (facts.caregiverVisitExpected && !facts.caregiverVisitPlanned) {
    gaps.push(`No caregiver visit is planned, and one is usually expected.`);
  }
  if (facts.documentsToCarry.length > 0) {
    plan.push(`Carry: ${facts.documentsToCarry.join(", ")}`);
  }
  if (facts.moneyShortNote) {
    gaps.push(facts.moneyShortNote);
  }

  const ready = gaps.length === 0;
  const headline =
    plan.length === 0 && ready
      ? `Tomorrow is clear for ${facts.subjectName}. Nothing to prepare.`
      : ready
        ? `Tomorrow is ready for ${facts.subjectName}.`
        : gaps.length === 1
          ? `Tomorrow is ready except one thing.`
          : `Tomorrow needs ${gaps.length} things settled.`;

  return { ready, headline, gaps, plan };
}
