/**
 * Proof of Care — the week, accounted for.
 *
 * For families paying and caring from far away, trust is built from
 * specifics: visits that happened, doses that were taken, receipts that
 * were kept, duties that closed. This composes the weekly account in the
 * family's voice — warm, exact, and honest about what stayed open.
 */

export interface ProofOfCareFacts {
  workspaceName: string;
  weekLabel: string; // e.g. "Week of 29 June"
  visitsLogged: number;
  dosesTaken: number;
  dosesMissed: number;
  receiptsUploaded: number;
  appointmentsAttended: number;
  dutiesCompleted: number;
  attentionResolved: number;
  attentionStillOpen: { title: string; subjectName: string }[];
  checkinsReceived: number;
}

export interface ProofOfCareStats {
  visits: number;
  dosesTaken: number;
  dosesMissed: number;
  receipts: number;
  appointments: number;
  dutiesCompleted: number;
  attentionResolved: number;
  attentionOpen: number;
  checkins: number;
}

export function composeProofOfCare(facts: ProofOfCareFacts): {
  body: string;
  stats: ProofOfCareStats;
} {
  const lines: string[] = [];

  lines.push(`${facts.weekLabel} — how the family showed up.`);
  lines.push("");

  const cared: string[] = [];
  if (facts.checkinsReceived > 0)
    cared.push(`${count(facts.checkinsReceived, "check-in")} arrived`);
  if (facts.visitsLogged > 0)
    cared.push(`${count(facts.visitsLogged, "caregiver visit")} ${facts.visitsLogged === 1 ? "was" : "were"} logged`);
  if (facts.dosesTaken > 0)
    cared.push(`${count(facts.dosesTaken, "dose")} ${facts.dosesTaken === 1 ? "was" : "were"} confirmed taken`);
  if (facts.appointmentsAttended > 0)
    cared.push(`${count(facts.appointmentsAttended, "appointment")} went ahead`);
  lines.push(
    cared.length > 0
      ? `${sentence(cared)}.`
      : `A quiet week — no visits or doses were logged.`,
  );

  const kept: string[] = [];
  if (facts.dutiesCompleted > 0) kept.push(`${count(facts.dutiesCompleted, "duty")} closed`);
  if (facts.receiptsUploaded > 0)
    kept.push(`${count(facts.receiptsUploaded, "receipt")} kept in the record`);
  if (facts.attentionResolved > 0)
    kept.push(`${count(facts.attentionResolved, "attention item")} settled`);
  if (kept.length > 0) lines.push(`${capitalize(sentence(kept))}.`);

  if (facts.dosesMissed > 0) {
    lines.push(
      `${count(facts.dosesMissed, "dose")} ${facts.dosesMissed === 1 ? "was" : "were"} marked missed — the record keeps it honestly.`,
    );
  }

  if (facts.attentionStillOpen.length > 0) {
    lines.push("");
    lines.push(`Still open going into next week:`);
    for (const item of facts.attentionStillOpen) {
      lines.push(`· ${item.title} (${item.subjectName})`);
    }
  } else {
    lines.push("");
    lines.push(`Nothing is left hanging. The week closed clean.`);
  }

  return {
    body: lines.join("\n"),
    stats: {
      visits: facts.visitsLogged,
      dosesTaken: facts.dosesTaken,
      dosesMissed: facts.dosesMissed,
      receipts: facts.receiptsUploaded,
      appointments: facts.appointmentsAttended,
      dutiesCompleted: facts.dutiesCompleted,
      attentionResolved: facts.attentionResolved,
      attentionOpen: facts.attentionStillOpen.length,
      checkins: facts.checkinsReceived,
    },
  };
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function sentence(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
