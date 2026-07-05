/**
 * Family Handover — one pair of hands passes the day to the next.
 *
 * A caregiver going off, a sibling taking the weekend, a parent handing
 * the evening over: the handover says what happened, what's open, and
 * what's worth an eye — so nothing important lives only in one head.
 */

export interface HandoverFacts {
  subjectName: string;
  fromName: string;
  toName?: string | null;
  /** e.g. "Checked in at 08:10, feeling okay" — today's notable moments. */
  today: string[];
  openDuties: { title: string; ownerName?: string | null }[];
  medication: { dosesTaken: number; dosesOpen: number };
  expensesToday: { note: string }[];
  upcoming: { title: string; when: string }[];
  worthWatching: string[];
}

export function composeHandover(facts: HandoverFacts): string {
  const lines: string[] = [];
  const to = facts.toName ? ` to ${facts.toName}` : "";
  lines.push(`Handover from ${facts.fromName}${to} — ${facts.subjectName}.`);
  lines.push("");

  lines.push(
    facts.today.length > 0
      ? `Today: ${facts.today.join(" · ")}.`
      : `Today was quiet — nothing out of the ordinary was logged.`,
  );

  const { dosesTaken, dosesOpen } = facts.medication;
  if (dosesTaken + dosesOpen > 0) {
    lines.push(
      dosesOpen === 0
        ? `Medication: all ${dosesTaken === 1 ? "the dose" : `${dosesTaken} doses`} taken.`
        : `Medication: ${dosesTaken} taken, ${dosesOpen} still open — the next pair of hands picks this up.`,
    );
  }

  if (facts.openDuties.length > 0) {
    lines.push(
      `Open duties: ${facts.openDuties
        .map((d) => (d.ownerName ? `${d.title} (${d.ownerName})` : d.title))
        .join(" · ")}.`,
    );
  }

  if (facts.expensesToday.length > 0) {
    lines.push(`Spent today: ${facts.expensesToday.map((e) => e.note).join(" · ")}.`);
  }

  if (facts.upcoming.length > 0) {
    lines.push(
      `Coming up: ${facts.upcoming.map((u) => `${u.title} · ${u.when}`).join(" — ")}.`,
    );
  }

  if (facts.worthWatching.length > 0) {
    lines.push("");
    lines.push(`Worth an eye: ${facts.worthWatching.join(" · ")}.`);
  }

  return lines.join("\n");
}
