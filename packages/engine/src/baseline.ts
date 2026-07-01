import type { Baseline } from "./types";

/**
 * Baseline engine — "attention is defined against the person".
 * Rolling mean/stddev per subject per metric via Welford's algorithm,
 * so updates are O(1) and never need the full history.
 */

export interface WelfordState {
  n: number;
  mean: number;
  m2: number;
}

export function emptyState(): WelfordState {
  return { n: 0, mean: 0, m2: 0 };
}

export function updateState(state: WelfordState, value: number): WelfordState {
  const n = state.n + 1;
  const delta = value - state.mean;
  const mean = state.mean + delta / n;
  const m2 = state.m2 + delta * (value - mean);
  return { n, mean, m2 };
}

export function stddev(state: WelfordState): number {
  if (state.n < 2) return 0;
  return Math.sqrt(state.m2 / (state.n - 1));
}

export function toBaseline(
  metric: string,
  window: string,
  state: WelfordState,
): Baseline {
  return { metric, window, mean: state.mean, stddev: stddev(state), n: state.n };
}

export function computeBaseline(
  metric: string,
  window: string,
  values: number[],
): Baseline {
  let state = emptyState();
  for (const v of values) state = updateState(state, v);
  return toBaseline(metric, window, state);
}

export type DeviationDirection = "above" | "below" | "within";

export interface Deviation {
  direction: DeviationDirection;
  /** How many standard deviations from the personal mean. */
  sigma: number;
  /** True when the baseline has enough history to be trusted. */
  reliable: boolean;
}

const MIN_SAMPLES = 5;

/**
 * Compare a fresh value to the personal baseline. With too little history
 * the deviation reports unreliable and rules stay quiet — calm by default.
 */
export function deviation(baseline: Baseline, value: number): Deviation {
  const reliable = baseline.n >= MIN_SAMPLES && baseline.stddev > 0;
  if (!reliable) return { direction: "within", sigma: 0, reliable: false };
  const sigma = (value - baseline.mean) / baseline.stddev;
  const direction: DeviationDirection =
    sigma > 2 ? "above" : sigma < -2 ? "below" : "within";
  return { direction, sigma, reliable: true };
}
