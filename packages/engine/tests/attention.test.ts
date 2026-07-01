import { describe, expect, it } from "vitest";
import { runAttentionRules } from "../src/attention";
import { computeBaseline } from "../src/baseline";
import type { AttentionContext, SubjectSnapshot } from "../src/types";

const SUBJECT: SubjectSnapshot = {
  id: "s1",
  displayName: "Mum",
  kind: "elder",
  timezone: "UTC",
  expectedCheckinBy: "11:00",
  expectedVisitEveryHours: null,
};

// 14:00 UTC — comfortably past morning schedules.
const NOW = new Date("2026-07-01T14:00:00Z");

function ctx(overrides: Partial<AttentionContext> = {}): AttentionContext {
  return {
    subject: SUBJECT,
    now: NOW,
    recentSignals: [],
    interpretations: [],
    duties: [],
    medications: [],
    doseLogs: [],
    appointments: [],
    caregiverVisits: [],
    baselines: [],
    openAttentionKeys: new Set(),
    ...overrides,
  };
}

const checkinSignal = {
  id: "sig-1",
  subjectId: "s1",
  signalType: "checkin" as const,
  source: "manual_checkin" as const,
  value: { mood: "okay" },
  privacyLevel: "family" as const,
  occurredAt: "2026-07-01T08:30:00Z",
};

describe("attention rules", () => {
  it("calm by default: nothing fires on a quiet, healthy day", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        medications: [
          {
            id: "m1",
            subjectId: "s1",
            name: "Amlodipine",
            times: ["08:00"],
            active: true,
          },
        ],
        doseLogs: [
          { medicationId: "m1", status: "taken", at: "2026-07-01T08:05:00Z" },
        ],
      }),
    );
    expect(events).toHaveLength(0);
  });

  it("fires missed_dose when a scheduled dose has no log past grace", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        medications: [
          {
            id: "m1",
            subjectId: "s1",
            name: "Amlodipine",
            dose: "5mg",
            times: ["08:00"],
            active: true,
          },
        ],
      }),
    );
    const missed = events.find((e) => e.kind === "missed_dose");
    expect(missed).toBeDefined();
    expect(missed!.title).toContain("Amlodipine");
    expect(missed!.title).not.toMatch(/risk|non-compliance/i);
  });

  it("does not fire missed_dose before the grace window", () => {
    const events = runAttentionRules(
      ctx({
        now: new Date("2026-07-01T08:30:00Z"),
        recentSignals: [checkinSignal],
        medications: [
          { id: "m1", subjectId: "s1", name: "Amlodipine", times: ["08:00"], active: true },
        ],
      }),
    );
    expect(events.find((e) => e.kind === "missed_dose")).toBeUndefined();
  });

  it("fires missed_checkin past the expected time + grace", () => {
    const events = runAttentionRules(ctx());
    const missed = events.find((e) => e.kind === "missed_checkin");
    expect(missed).toBeDefined();
    expect(missed!.title).toBe("No check-in from Mum yet today");
  });

  it("fires transport_unconfirmed inside the window, urgent within 12h", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        appointments: [
          {
            id: "a1",
            subjectId: "s1",
            kind: "clinic",
            title: "clinic review",
            startsAt: "2026-07-02T10:00:00Z", // 20h away
            transportConfirmed: false,
            transportOwnerName: "Sarah",
          },
          {
            id: "a2",
            subjectId: "s1",
            kind: "clinic",
            title: "physio",
            startsAt: "2026-07-01T20:00:00Z", // 6h away
            transportConfirmed: false,
          },
        ],
      }),
    );
    const t1 = events.find((e) => e.dedupeKey === "transport_unconfirmed:a1");
    const t2 = events.find((e) => e.dedupeKey === "transport_unconfirmed:a2");
    expect(t1?.severity).toBe("attention");
    expect(t1?.detail).toContain("Sarah");
    expect(t2?.severity).toBe("urgent");
  });

  it("stays quiet when transport is confirmed", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        appointments: [
          {
            id: "a1",
            subjectId: "s1",
            kind: "clinic",
            title: "clinic review",
            startsAt: "2026-07-02T10:00:00Z",
            transportConfirmed: true,
          },
        ],
      }),
    );
    expect(events.find((e) => e.kind === "transport_unconfirmed")).toBeUndefined();
  });

  it("is idempotent: open dedupe keys suppress re-firing", () => {
    const base = ctx({
      recentSignals: [checkinSignal],
      medications: [
        { id: "m1", subjectId: "s1", name: "Amlodipine", times: ["08:00"], active: true },
      ],
    });
    const first = runAttentionRules(base);
    expect(first.length).toBeGreaterThan(0);
    const second = runAttentionRules({
      ...base,
      openAttentionKeys: new Set(first.map((e) => e.dedupeKey)),
    });
    expect(second).toHaveLength(0);
  });

  it("fires refill warnings ahead of the refill date", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        medications: [
          {
            id: "m1",
            subjectId: "s1",
            name: "Metformin",
            times: [],
            active: true,
            refillAt: "2026-07-03",
          },
        ],
      }),
    );
    const refill = events.find((e) => e.kind === "medication_refill_due");
    expect(refill).toBeDefined();
    expect(refill!.title).toContain("Metformin");
  });

  it("flags overdue duties with the owner named", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        duties: [
          {
            id: "d1",
            subjectId: "s1",
            title: "Buy groceries",
            status: "open",
            priority: "high",
            dueAt: "2026-06-30T18:00:00Z",
            ownerName: "Tino",
            ownerMemberId: "mem-2",
          },
        ],
      }),
    );
    const overdue = events.find((e) => e.kind === "duty_overdue");
    expect(overdue?.severity).toBe("attention");
    expect(overdue?.ownerMemberId).toBe("mem-2");
  });

  it("flags a caregiver visit gap when a cadence is expected", () => {
    const events = runAttentionRules(
      ctx({
        subject: { ...SUBJECT, expectedVisitEveryHours: 24 },
        recentSignals: [checkinSignal],
        caregiverVisits: [{ subjectId: "s1", checkIn: "2026-06-29T09:00:00Z" }],
      }),
    );
    expect(events.find((e) => e.kind === "no_caregiver_visit")).toBeDefined();
  });

  it("raises a repeated symptom as a watch, phrased as worth a check", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [checkinSignal],
        interpretations: [
          { signalId: "x1", label: "symptom:dizziness", confidence: 0.8 },
          { signalId: "x2", label: "symptom:dizziness", confidence: 0.7 },
        ],
      }),
    );
    const symptom = events.find((e) => e.kind === "repeated_symptom");
    expect(symptom?.severity).toBe("watch");
    expect(symptom?.detail).toContain("Worth a check");
  });

  it("uses the personal baseline for low sleep, not an absolute threshold", () => {
    const baseline = computeBaseline(
      "sleep_minutes",
      "14d",
      [420, 430, 410, 425, 415, 435, 420],
    );
    const events = runAttentionRules(
      ctx({
        recentSignals: [
          checkinSignal,
          {
            id: "sig-sleep",
            subjectId: "s1",
            signalType: "metric",
            source: "manual_metric",
            value: { metric: "sleep_minutes", value: 340 },
            privacyLevel: "medical_private",
            occurredAt: "2026-07-01T06:30:00Z",
          },
        ],
        baselines: [baseline],
      }),
    );
    const low = events.find((e) => e.kind === "low_activity");
    expect(low).toBeDefined();
    expect(low!.title).toContain("usual week");
    expect(low!.severity).toBe("watch");
  });

  it("surfaces an unwell check-in as attention with human wording", () => {
    const events = runAttentionRules(
      ctx({
        recentSignals: [
          {
            ...checkinSignal,
            value: { mood: "unwell", note: "dizzy this morning" },
          },
        ],
      }),
    );
    const unwell = events.find((e) => e.kind === "worth_a_check");
    expect(unwell).toBeDefined();
    expect(unwell!.detail).toContain("dizzy this morning");
  });
});
