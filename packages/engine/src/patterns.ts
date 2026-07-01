import { computeBaseline, deviation } from "./baseline";

/**
 * Pattern engine — plain-language trend cards against personal baselines.
 * Never a diagnosis: direction + framing only, and quiet without evidence.
 */

export interface PatternResult {
  metric: string;
  direction: "up" | "down" | "steady" | "irregular";
  summary: string;
  window: string;
}

const METRIC_LABEL: Record<string, { noun: string; up: string; down: string }> = {
  sleep_minutes: { noun: "Sleep", up: "longer", down: "shorter" },
  steps: { noun: "Movement", up: "higher", down: "lower" },
  mood: { noun: "Mood", up: "brighter", down: "lower" },
  spend: { noun: "Spending", up: "higher", down: "lower" },
  adherence: { noun: "Medication rhythm", up: "steadier", down: "less steady" },
  checkin_time: { noun: "Check-in time", up: "later", down: "earlier" },
};

/**
 * Compare the recent window (default last 7 values) to the personal
 * baseline built from the values before it.
 */
export function detectPattern(
  metric: string,
  values: number[],
  subjectName: string,
  recentWindow = 7,
): PatternResult | null {
  if (values.length < recentWindow + 5) return null;

  const history = values.slice(0, values.length - recentWindow);
  const recent = values.slice(-recentWindow);
  const base = computeBaseline(metric, "history", history);
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const dev = deviation(base, recentMean);
  if (!dev.reliable) return null;

  const label = METRIC_LABEL[metric] ?? {
    noun: metric,
    up: "higher",
    down: "lower",
  };

  if (dev.direction === "within") {
    return {
      metric,
      direction: "steady",
      summary: `${label.noun} has been steady for ${subjectName} — in line with her usual rhythm.`,
      window: `${recentWindow}d`,
    };
  }

  const dirWord = dev.direction === "above" ? label.up : label.down;
  return {
    metric,
    direction: dev.direction === "above" ? "up" : "down",
    summary: `${label.noun} has been ${dirWord} than ${subjectName}'s usual week. Worth a check.`,
    window: `${recentWindow}d`,
  };
}
