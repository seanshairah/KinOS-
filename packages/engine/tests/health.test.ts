import { describe, expect, it } from "vitest";
import {
  reduceHealthReading,
  type HealthContext,
  type HealthReading,
} from "../src/health";
import type { Baseline } from "../src/types";

const NOW = new Date("2026-06-21T08:00:00Z");

function bp(systolic: number, diastolic: number, daysAgo = 0, id?: string): HealthReading {
  return {
    id,
    metric: "blood_pressure",
    value: { systolic, diastolic },
    takenAt: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(),
  };
}

function ctx(overrides: Partial<HealthContext>): HealthContext {
  return {
    subject: { id: "subj-1", displayName: "Gogo" },
    now: NOW,
    reading: bp(120, 80),
    recent: [],
    openAttentionKeys: new Set(),
    ...overrides,
  };
}

const BP_BASELINE: Baseline = {
  metric: "bp_systolic",
  window: "14d",
  mean: 125,
  stddev: 6,
  n: 20,
};

describe("health reducer — blood pressure", () => {
  it("stays silent on a normal reading", () => {
    const out = reduceHealthReading(ctx({ reading: bp(124, 79) }));
    expect(out.observation).toBeUndefined();
    expect(out.attention).toBeUndefined();
  });

  it("first elevated reading is a quiet drift note, no attention", () => {
    const out = reduceHealthReading(
      ctx({ reading: bp(152, 94), baseline: BP_BASELINE }),
    );
    expect(out.observation?.kind).toBe("drift");
    expect(out.attention).toBeUndefined();
  });

  it("second elevated reading within the window raises attention", () => {
    const out = reduceHealthReading(
      ctx({
        reading: bp(150, 92, 0, "r2"),
        recent: [bp(151, 93, 5, "r1")],
        baseline: BP_BASELINE,
      }),
    );
    expect(out.observation?.kind).toBe("pattern");
    expect(out.observation?.summary).toContain("second");
    expect(out.attention?.kind).toBe("health_pattern");
    expect(out.attention?.severity).toBe("attention");
    expect(out.attention?.dedupeKey).toContain("subj-1");
    expect(out.observation?.readingIds).toEqual(["r1", "r2"]);
  });

  it("an elevated reading nine days after the first stays a quiet note", () => {
    const out = reduceHealthReading(
      ctx({
        reading: bp(150, 92),
        recent: [bp(151, 93, 9)],
        baseline: BP_BASELINE,
      }),
    );
    expect(out.observation?.kind).toBe("drift");
    expect(out.attention).toBeUndefined();
  });

  it("dedupes against an already-open attention event", () => {
    const key = `health_pattern:subj-1:blood_pressure:${NOW.toISOString().slice(0, 10)}`;
    const out = reduceHealthReading(
      ctx({
        reading: bp(150, 92),
        recent: [bp(151, 93, 3)],
        baseline: BP_BASELINE,
        openAttentionKeys: new Set([key]),
      }),
    );
    expect(out.observation?.kind).toBe("pattern");
    expect(out.attention).toBeUndefined();
  });

  it("uses the personal baseline over the fallback band when reliable", () => {
    // 139 is under the generic 150 band but well above HER usual 125±6.
    const out = reduceHealthReading(
      ctx({ reading: bp(139, 82), baseline: BP_BASELINE }),
    );
    expect(out.observation?.kind).toBe("drift");
  });

  it("errs quiet without history: 139 with no baseline is silence", () => {
    const out = reduceHealthReading(ctx({ reading: bp(139, 82) }));
    expect(out.observation).toBeUndefined();
  });

  it("never uses diagnostic language", () => {
    const out = reduceHealthReading(
      ctx({
        reading: bp(160, 100, 0),
        recent: [bp(158, 98, 2)],
        baseline: BP_BASELINE,
      }),
    );
    const text = [
      out.observation?.summary,
      out.observation?.detail,
      out.attention?.title,
      out.attention?.detail,
    ]
      .join(" ")
      .toLowerCase();
    for (const banned of ["hypertension", "diagnos", "disease", "danger"]) {
      expect(text).not.toContain(banned);
    }
    expect(text).toContain("worth a check");
  });
});

describe("health reducer — sleep", () => {
  const night = (minutes: number, daysAgo: number): HealthReading => ({
    metric: "sleep_minutes",
    value: { value: minutes },
    takenAt: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(),
  });

  it("one short night is silence", () => {
    const out = reduceHealthReading(
      ctx({ reading: night(250, 0), recent: [night(420, 1), night(430, 2)] }),
    );
    expect(out.observation).toBeUndefined();
  });

  it("three short nights in a row become a pattern observation, not an alarm", () => {
    const out = reduceHealthReading(
      ctx({ reading: night(250, 0), recent: [night(260, 1), night(240, 2)] }),
    );
    expect(out.observation?.kind).toBe("pattern");
    expect(out.attention).toBeUndefined();
  });
});

describe("health reducer — steps and unruled metrics", () => {
  it("a quiet day against a reliable baseline is a drift note only", () => {
    const out = reduceHealthReading(
      ctx({
        reading: { metric: "steps", value: { value: 900 }, takenAt: NOW.toISOString() },
        baseline: { metric: "steps", window: "14d", mean: 4200, stddev: 800, n: 14 },
      }),
    );
    expect(out.observation?.kind).toBe("drift");
    expect(out.attention).toBeUndefined();
  });

  it("weight readings store silently — no rules yet", () => {
    const out = reduceHealthReading(
      ctx({
        reading: { metric: "weight", value: { value: 72 }, takenAt: NOW.toISOString() },
      }),
    );
    expect(out).toEqual({});
  });
});
