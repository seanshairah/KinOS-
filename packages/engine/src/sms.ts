/**
 * The SMS check-in reply parser. The person at the centre of an Orbit is
 * often the least likely to use an app — so KinOS asks by text and accepts
 * the simplest possible answers: a digit, or a plain word in English, Shona
 * or Ndebele. Deterministic rules, no guessing: anything ambiguous returns
 * null and the sender is gently asked for a 1, 2 or 3.
 */

export type SmsMood = "good" | "okay" | "unwell";

const DIGITS: Record<string, SmsMood> = { "1": "good", "2": "okay", "3": "unwell" };

// Phrases are matched before single words so "not bad" never reads as "bad".
const PHRASES: Array<[string, SmsMood]> = [
  ["not bad", "okay"],
  ["so so", "okay"],
  ["not great", "unwell"],
  ["not good", "unwell"],
  ["not well", "unwell"],
  ["not okay", "unwell"],
  ["not ok", "unwell"],
  ["not fine", "unwell"],
  ["not feeling well", "unwell"],
  ["not feeling good", "unwell"],
  ["not feeling great", "unwell"],
  ["doing well", "good"],
  ["very well", "good"],
  ["all good", "good"],
];

const WORDS: Record<string, SmsMood> = {
  // English
  good: "good",
  great: "good",
  well: "good",
  fine: "good",
  lovely: "good",
  strong: "good",
  ok: "okay",
  okay: "okay",
  alright: "okay",
  bad: "unwell",
  unwell: "unwell",
  sick: "unwell",
  ill: "unwell",
  poorly: "unwell",
  tired: "unwell",
  weak: "unwell",
  dizzy: "unwell",
  pain: "unwell",
  // Shona
  zvakanaka: "good", // it's good
  ndiripo: "good", // I'm here / I'm fine
  ndinofara: "good", // I'm happy
  kurwara: "unwell", // to be sick
  ndinorwara: "unwell", // I am sick
  // Ndebele
  kuhle: "good", // it's good
  ngikhona: "good", // I'm here / I'm fine
  ngiyaphila: "good", // I'm well
  kulungile: "okay", // it's okay
  ngiyagula: "unwell", // I'm sick
};

/**
 * Parse a free-text SMS reply into a check-in mood, or null when the message
 * doesn't clearly say how the sender is. A digit anywhere at the start wins;
 * then negated phrases; then plain words.
 */
export function parseSmsCheckinReply(body: string): { mood: SmsMood } | null {
  const cleaned = body
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ") // drop punctuation and emoji
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  // A leading digit is the canonical answer ("1", "2 thanks", "3.").
  const first = cleaned.split(" ")[0]!;
  if (first in DIGITS) return { mood: DIGITS[first]! };

  const padded = ` ${cleaned} `;
  for (const [phrase, mood] of PHRASES) {
    if (padded.includes(` ${phrase} `)) return { mood };
  }

  for (const word of cleaned.split(" ")) {
    if (word in WORDS) return { mood: WORDS[word]! };
  }
  return null;
}
