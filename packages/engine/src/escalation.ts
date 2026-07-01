/**
 * Escalation ladder — routes an unresolved attention event up:
 * duty owner → workspace admins → emergency contacts, honouring quiet hours
 * except for urgent severity (urgent never waits).
 */

import { parseHHMM, localParts } from "./time";
import type { Severity } from "./types";

export interface LadderRung {
  target: "owner" | "admins" | "emergency_contacts";
  afterMinutes: number;
}

export const DEFAULT_LADDER: LadderRung[] = [
  { target: "owner", afterMinutes: 0 },
  { target: "admins", afterMinutes: 6 * 60 },
  { target: "emergency_contacts", afterMinutes: 24 * 60 },
];

export interface QuietHours {
  start: string; // "21:00"
  end: string; // "07:00"
  timezone: string;
}

export function inQuietHours(now: Date, quiet: QuietHours | null): boolean {
  if (!quiet) return false;
  const minutes = localParts(now, quiet.timezone).minutesOfDay;
  const start = parseHHMM(quiet.start);
  const end = parseHHMM(quiet.end);
  return start <= end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

export interface EscalationDecision {
  notifyNow: boolean;
  target: LadderRung["target"];
  reason: string;
}

export function decideEscalation(params: {
  severity: Severity;
  createdAt: Date;
  now: Date;
  ladder?: LadderRung[];
  quietHours?: QuietHours | null;
}): EscalationDecision {
  const ladder = params.ladder ?? DEFAULT_LADDER;
  const ageMinutes =
    (params.now.getTime() - params.createdAt.getTime()) / 60_000;

  let rung: LadderRung = ladder[0] ?? { target: "owner", afterMinutes: 0 };
  for (const r of ladder) {
    if (ageMinutes >= r.afterMinutes) rung = r;
  }

  const quiet = inQuietHours(params.now, params.quietHours ?? null);
  if (quiet && params.severity !== "urgent") {
    return {
      notifyNow: false,
      target: rung.target,
      reason: "held for quiet hours",
    };
  }
  return {
    notifyNow: true,
    target: rung.target,
    reason:
      rung.afterMinutes === 0
        ? "first notice to owner"
        : `unresolved after ${Math.floor(ageMinutes / 60)}h — escalated`,
  };
}
