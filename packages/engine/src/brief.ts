import { localParts } from "./time";
import type {
  AppointmentSnapshot,
  AttentionCandidate,
  CheckinValue,
  DutySnapshot,
  LifeSignal,
  SubjectSnapshot,
} from "./types";

/**
 * Brief engine — composes the Daily Brief in the KinOS voice.
 *
 * Two paths share this module:
 *  - `composeBriefFacts` distils the day into structured facts. The writing
 *    layer (packages/ai) turns facts into warmer prose when configured.
 *  - `composeBriefText` is the deterministic composer: calm, plain,
 *    grammatical — always available, no external calls. The product never
 *    ships an empty or broken brief.
 */

export interface BriefAction {
  label: string;
  kind:
    | "assign_transport"
    | "nudge_member"
    | "mark_dose_taken"
    | "complete_duty"
    | "view_orbit";
  targetId?: string;
}

export interface BriefFacts {
  subjectName: string;
  dateLabel: string;
  checkin: { mood: string; ate?: boolean; note?: string } | null;
  dosesTaken: number;
  dosesOpen: number;
  attention: { title: string; detail?: string }[];
  upcoming: { title: string; when: string; transportConfirmed: boolean }[];
  openDuties: { title: string; owner?: string }[];
  moneyNote?: string;
}

export interface BriefInput {
  subject: SubjectSnapshot;
  now: Date;
  todaysSignals: LifeSignal[];
  attention: AttentionCandidate[];
  upcomingAppointments: AppointmentSnapshot[];
  openDuties: DutySnapshot[];
  dosesTaken: number;
  dosesOpen: number;
  moneyNote?: string;
}

const MOOD_PHRASE: Record<string, string> = {
  good: "doing well",
  okay: "okay",
  low: "a little low",
  unwell: "not feeling well",
};

export function composeBriefFacts(input: BriefInput): BriefFacts {
  const { subject, now } = input;
  const local = localParts(now, subject.timezone);

  const checkinSignal = input.todaysSignals
    .filter((s) => s.signalType === "checkin")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const checkinValue = (checkinSignal?.value ?? null) as CheckinValue | null;

  return {
    subjectName: subject.displayName,
    dateLabel: local.date,
    checkin: checkinValue
      ? { mood: checkinValue.mood, ate: checkinValue.ate, note: checkinValue.note }
      : null,
    dosesTaken: input.dosesTaken,
    dosesOpen: input.dosesOpen,
    attention: input.attention.map((a) => ({ title: a.title, detail: a.detail })),
    upcoming: input.upcomingAppointments.map((a) => ({
      title: a.title,
      when: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: subject.timezone,
      }).format(new Date(a.startsAt)),
      transportConfirmed: a.transportConfirmed,
    })),
    openDuties: input.openDuties.map((d) => ({
      title: d.title,
      owner: d.ownerName ?? undefined,
    })),
    moneyNote: input.moneyNote,
  };
}

export function composeBriefText(facts: BriefFacts): string {
  const parts: string[] = [];

  if (facts.checkin) {
    let line = `${facts.subjectName} is ${MOOD_PHRASE[facts.checkin.mood] ?? "okay"} today.`;
    if (facts.checkin.ate === true) line += " Meals were eaten.";
    if (facts.checkin.ate === false) line += " Appetite was low.";
    parts.push(line);
  } else {
    parts.push(`No check-in from ${facts.subjectName} yet today.`);
  }

  if (facts.dosesTaken > 0 && facts.dosesOpen === 0) {
    parts.push("All medication so far has been taken.");
  } else if (facts.dosesOpen > 0) {
    parts.push(
      facts.dosesOpen === 1
        ? "One dose is still open."
        : `${facts.dosesOpen} doses are still open.`,
    );
  }

  for (const u of facts.upcoming.slice(0, 2)) {
    let line = `${u.title} is coming up ${u.when}.`;
    if (!u.transportConfirmed) line += " Transport is not confirmed yet.";
    parts.push(line);
  }

  if (facts.attention.length > 0) {
    const first = facts.attention[0]!;
    parts.push(`Attention needed: ${lowerFirst(first.title)}.`);
    if (facts.attention.length > 1) {
      parts.push(
        facts.attention.length === 2
          ? "One more item is waiting in Attention Needed."
          : `${facts.attention.length - 1} more items are waiting in Attention Needed.`,
      );
    }
  } else if (facts.checkin) {
    parts.push("Nothing needs attention right now.");
  }

  if (facts.moneyNote) parts.push(facts.moneyNote);

  return parts.join(" ");
}

export function composeBriefActions(input: BriefInput): BriefAction[] {
  const actions: BriefAction[] = [];
  for (const a of input.attention) {
    if (a.kind === "transport_unconfirmed") {
      actions.push({ label: "Assign transport", kind: "assign_transport" });
      if (a.ownerMemberId) {
        actions.push({
          label: "Send a nudge",
          kind: "nudge_member",
          targetId: a.ownerMemberId,
        });
      }
    }
    if (a.kind === "missed_dose") {
      actions.push({ label: "Mark dose taken", kind: "mark_dose_taken" });
    }
    if (a.kind === "duty_overdue" && a.ownerMemberId) {
      actions.push({
        label: "Send a nudge",
        kind: "nudge_member",
        targetId: a.ownerMemberId,
      });
    }
  }
  // Dedupe by label, cap at three — a brief invites, it doesn't overwhelm.
  const seen = new Set<string>();
  return actions
    .filter((a) => (seen.has(a.label) ? false : (seen.add(a.label), true)))
    .slice(0, 3);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
