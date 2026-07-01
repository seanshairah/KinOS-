/**
 * Voice guard — the last line of defence before model text is stored.
 * Anything the model writes that could reach a family member is scrubbed
 * of machine/provider/clinical language; if scrubbing would mangle the
 * text, the caller falls back to the deterministic composer instead.
 */

const BANNED = [
  /\bAI\b/,
  /\bA\.I\.\b/,
  /artificial intelligence/i,
  /machine learning/i,
  /\bLLM\b/,
  /\bmodel\b/i,
  /\balgorithm/i,
  /\bClaude\b/,
  /\bAnthropic\b/,
  /\bOpenAI\b/i,
  /risk detected/i,
  /anomaly/i,
  /non-complian/i,
  /\bdiagnos/i,
  /\bsubject\b/i,
  /\bpatient\b/i,
];

export function violatesVoice(text: string): string | null {
  for (const re of BANNED) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

/** True when the text is safe to store as family-facing copy. */
export function passesVoice(text: string): boolean {
  return violatesVoice(text) === null;
}
