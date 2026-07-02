import { describe, expect, it } from "vitest";
import {
  composeBriefActions,
  composeBriefFacts,
  composeBriefText,
  type BriefInput,
} from "../src/brief";
import type { SubjectSnapshot } from "../src/types";

const SUBJECT: SubjectSnapshot = {
  id: "s1",
  displayName: "Mum",
  kind: "elder",
  timezone: "UTC",
};

const NOW = new Date("2026-07-01T08:10:00Z");

function input(overrides: Partial<BriefInput> = {}): BriefInput {
  return {
    subject: SUBJECT,
    now: NOW,
    todaysSignals: [],
    attention: [],
    upcomingAppointments: [],
    openDuties: [],
    dosesTaken: 0,
    dosesOpen: 0,
    ...overrides,
  };
}

describe("brief engine", () => {
  it("writes a calm brief for a good day", () => {
    const i = input({
      todaysSignals: [
        {
          id: "sig1",
          subjectId: "s1",
          signalType: "checkin",
          source: "manual_checkin",
          value: { mood: "okay", ate: true },
          privacyLevel: "family",
          occurredAt: "2026-07-01T08:05:00Z",
        },
      ],
      dosesTaken: 1,
    });
    const text = composeBriefText(composeBriefFacts(i));
    expect(text).toContain("Mum is okay today.");
    expect(text).toContain("All medication so far has been taken.");
    expect(text).toContain("Nothing needs attention right now.");
  });

  it("surfaces the real gap with attention phrasing", () => {
    const i = input({
      attention: [
        {
          subjectId: "s1",
          kind: "transport_unconfirmed",
          severity: "attention",
          title: "Transport not confirmed for clinic review",
          ownerMemberId: "mem-2",
          dedupeKey: "t:1",
        },
      ],
      upcomingAppointments: [
        {
          id: "a1",
          subjectId: "s1",
          kind: "clinic",
          title: "Clinic review",
          startsAt: "2026-07-02T10:00:00Z",
          transportConfirmed: false,
        },
      ],
    });
    const text = composeBriefText(composeBriefFacts(i));
    expect(text).toContain("Attention needed: transport not confirmed");
    expect(text).toContain("Transport is not confirmed yet.");
  });

  it("never uses clinical or machine language", () => {
    const i = input({
      attention: [
        {
          subjectId: "s1",
          kind: "missed_dose",
          severity: "attention",
          title: "Mum's 08:00 Amlodipine is still open",
          dedupeKey: "d:1",
        },
      ],
      dosesOpen: 1,
    });
    const text = composeBriefText(composeBriefFacts(i));
    for (const banned of [/risk/i, /anomal/i, /compliance/i, /\bAI\b/, /model/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it("offers inline actions for transport gaps, capped at three", () => {
    const i = input({
      attention: [
        {
          subjectId: "s1",
          kind: "transport_unconfirmed",
          severity: "attention",
          title: "Transport not confirmed",
          ownerMemberId: "mem-2",
          dedupeKey: "t:1",
        },
        {
          subjectId: "s1",
          kind: "missed_dose",
          severity: "attention",
          title: "Evening dose is still open",
          dedupeKey: "d:1",
        },
        {
          subjectId: "s1",
          kind: "duty_overdue",
          severity: "watch",
          title: "Groceries past due",
          ownerMemberId: "mem-3",
          dedupeKey: "du:1",
        },
      ],
    });
    const actions = composeBriefActions(i);
    expect(actions.length).toBeLessThanOrEqual(3);
    expect(actions.map((a) => a.kind)).toContain("assign_transport");
    expect(actions.map((a) => a.kind)).toContain("mark_dose_taken");
  });

  it("notes a missing check-in without alarm", () => {
    const text = composeBriefText(composeBriefFacts(input()));
    expect(text).toContain("No check-in from Mum yet today.");
    expect(text).not.toMatch(/alert|urgent|risk/i);
  });

  it("weaves consent-filtered health notes in calmly, capped at two", () => {
    const facts = composeBriefFacts(
      input({
        healthNotes: [
          "Blood pressure — caught early, easily managed",
          "Mum has had 3 short nights in a row.",
          "A third note that should be dropped",
        ],
      }),
    );
    expect(facts.healthNotes).toHaveLength(2);
    const text = composeBriefText(facts);
    expect(text).toContain("Blood pressure — caught early, easily managed.");
    expect(text).toContain("Mum has had 3 short nights in a row.");
    expect(text).not.toContain("third note");
  });
});
