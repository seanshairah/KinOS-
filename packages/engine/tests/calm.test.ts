import { describe, expect, it } from "vitest";
import { composeCalmDigest, runAttentionRules, type AttentionContext, type BriefFacts } from "../src";

/**
 * The calm layer: the all's-well digest, the very-still-day watch, and the
 * family-gone-quiet nudge. Every rule errs quiet — no data, no event.
 */

const baseFacts: BriefFacts = {
  subjectName: "Gogo",
  dateLabel: "2026-07-05",
  checkin: { mood: "good", ate: true },
  dosesTaken: 2,
  dosesOpen: 0,
  attention: [],
  upcoming: [],
  openDuties: [],
};

// A 15:30 UTC moment; the subject timezone below is UTC so local == UTC.
const AFTERNOON = new Date("2026-07-05T15:30:00Z");

function ctx(overrides: Partial<AttentionContext> = {}): AttentionContext {
  return {
    subject: {
      id: "s1",
      displayName: "Gogo",
      kind: "elder",
      timezone: "UTC",
      expectedCheckinBy: null,
      expectedVisitEveryHours: null,
    },
    now: AFTERNOON,
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

describe("composeCalmDigest", () => {
  it("writes the one calm line when nothing is open", () => {
    expect(composeCalmDigest(baseFacts)).toBe(
      "Gogo checked in — doing well. Meals eaten. All 2 doses taken. Nothing needs you tonight.",
    );
  });

  it("stays gentle without a check-in", () => {
    expect(composeCalmDigest({ ...baseFacts, checkin: null, dosesTaken: 0 })).toBe(
      "A quiet day around Gogo. Nothing needs you tonight.",
    );
  });

  it("steps aside the moment anything needs attention", () => {
    expect(
      composeCalmDigest({ ...baseFacts, attention: [{ title: "Missed dose" }] }),
    ).toBeNull();
    expect(composeCalmDigest({ ...baseFacts, dosesOpen: 1 })).toBeNull();
  });
});

describe("very still day (wearable)", () => {
  it("raises a gentle watch when a wearable shows almost no movement by mid-afternoon", () => {
    const out = runAttentionRules(ctx({ todaysSteps: 120 }));
    const still = out.find((c) => c.kind === "low_activity");
    expect(still).toBeDefined();
    expect(still!.severity).toBe("watch");
    expect(still!.dedupeKey).toBe("low_activity:s1:2026-07-05");
  });

  it("never alarms on absence of data or normal movement", () => {
    expect(runAttentionRules(ctx()).find((c) => c.kind === "low_activity")).toBeUndefined();
    expect(
      runAttentionRules(ctx({ todaysSteps: null })).find((c) => c.kind === "low_activity"),
    ).toBeUndefined();
    expect(
      runAttentionRules(ctx({ todaysSteps: 4200 })).find((c) => c.kind === "low_activity"),
    ).toBeUndefined();
  });

  it("waits until mid-afternoon before saying anything", () => {
    const morning = ctx({ todaysSteps: 50, now: new Date("2026-07-05T09:00:00Z") });
    expect(runAttentionRules(morning).find((c) => c.kind === "low_activity")).toBeUndefined();
  });
});

describe("the family has gone quiet", () => {
  it("says so softly after three days without any member touch", () => {
    const fourDaysAgo = new Date(AFTERNOON.getTime() - 4 * 24 * 3600_000).toISOString();
    const out = runAttentionRules(ctx({ lastFamilyTouchAt: fourDaysAgo }));
    const quiet = out.find((c) => c.kind === "family_quiet");
    expect(quiet).toBeDefined();
    expect(quiet!.title).toBe("It's been 4 days since anyone checked on Gogo");
    expect(quiet!.dedupeKey).toBe("family_quiet:s1");
  });

  it("stays silent while the family is present, and during onboarding", () => {
    const yesterday = new Date(AFTERNOON.getTime() - 24 * 3600_000).toISOString();
    expect(
      runAttentionRules(ctx({ lastFamilyTouchAt: yesterday })).find(
        (c) => c.kind === "family_quiet",
      ),
    ).toBeUndefined();
    // null = nobody has ever touched the orbit — that's onboarding, not neglect
    expect(
      runAttentionRules(ctx({ lastFamilyTouchAt: null })).find(
        (c) => c.kind === "family_quiet",
      ),
    ).toBeUndefined();
  });
});
