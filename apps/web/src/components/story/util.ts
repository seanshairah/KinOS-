/** Small pure helpers for the scroll-driven evening. */

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** Progress of p through the window [a, b], clamped to 0..1. */
export const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/** Ease that keeps motion calm at both ends. */
export const ease = (t: number) => t * t * (3 - 2 * t);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const c = a.map((v, i) => Math.round(v + (b[i]! - v) * clamp01(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function sampleRgb(
  stops: readonly (readonly [number, string])[],
  p: number,
): [number, number, number] {
  const v = clamp01(p);
  for (let i = 1; i < stops.length; i++) {
    const [b, cb] = stops[i]!;
    const [a, ca] = stops[i - 1]!;
    if (v <= b) {
      const t = clamp01((v - a) / (b - a));
      const from = hexToRgb(ca);
      const to = hexToRgb(cb);
      return [0, 1, 2].map((j) => Math.round(from[j]! + (to[j]! - from[j]!) * t)) as [
        number,
        number,
        number,
      ];
    }
  }
  return hexToRgb(stops[stops.length - 1]![1]);
}

/** Sample a gradient of [stop, color] pairs at progress p. */
export function skyAt(stops: readonly (readonly [number, string])[], p: number): string {
  const [r, g, b] = sampleRgb(stops, p);
  return `rgb(${r},${g},${b})`;
}

/** Sample the same gradient but with an alpha — for feathered glows. */
export function skyRgba(
  stops: readonly (readonly [number, string])[],
  p: number,
  alpha: number,
): string {
  const [r, g, b] = sampleRgb(stops, p);
  return `rgba(${r},${g},${b},${clamp01(alpha).toFixed(3)})`;
}

/** hex + alpha → rgba() string, for composing glow gradients. */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp01(alpha).toFixed(3)})`;
}

/** "17:42" → "20:00" as the evening passes. */
export function clockAt(startMinutes: number, endMinutes: number, p: number): string {
  const m = Math.round(startMinutes + (endMinutes - startMinutes) * clamp01(p));
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
