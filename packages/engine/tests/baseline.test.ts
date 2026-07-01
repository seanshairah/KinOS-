import { describe, expect, it } from "vitest";
import {
  computeBaseline,
  deviation,
  emptyState,
  stddev,
  toBaseline,
  updateState,
} from "../src/baseline";

describe("baseline engine", () => {
  it("computes rolling mean and stddev (Welford)", () => {
    let s = emptyState();
    for (const v of [400, 420, 410, 430, 405, 415]) s = updateState(s, v);
    const b = toBaseline("sleep_minutes", "14d", s);
    expect(b.n).toBe(6);
    expect(b.mean).toBeCloseTo(413.33, 1);
    expect(b.stddev).toBeCloseTo(10.8, 0);
  });

  it("matches a batch computation", () => {
    const values = [7, 9, 8, 10, 6, 9, 8];
    const b = computeBaseline("steps", "14d", values);
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    expect(b.mean).toBeCloseTo(mean, 6);
  });

  it("stays quiet with too little history", () => {
    const b = computeBaseline("sleep_minutes", "14d", [400, 500]);
    const d = deviation(b, 100);
    expect(d.reliable).toBe(false);
    expect(d.direction).toBe("within");
  });

  it("flags a value more than 2 sigma below the personal mean", () => {
    const b = computeBaseline(
      "sleep_minutes",
      "14d",
      [420, 430, 410, 425, 415, 435, 420],
    );
    const d = deviation(b, 340);
    expect(d.reliable).toBe(true);
    expect(d.direction).toBe("below");
    expect(d.sigma).toBeLessThan(-2);
  });

  it("treats values near the personal mean as within", () => {
    const b = computeBaseline(
      "sleep_minutes",
      "14d",
      [420, 430, 410, 425, 415, 435, 420],
    );
    expect(deviation(b, 424).direction).toBe("within");
  });

  it("zero-variance history is not treated as reliable", () => {
    const b = computeBaseline("glucose", "14d", [5, 5, 5, 5, 5, 5]);
    expect(deviation(b, 9).reliable).toBe(false);
  });
});
