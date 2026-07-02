import { DUSK, RADII } from "@kinos/ui/dusk";

/** The Dusk system on native — same tokens, same calm. */
export const T = {
  ...DUSK,
  r: RADII,
  serif: "Georgia",
  mono: "Menlo",
} as const;

export const MOODS = [
  { key: "good", label: "Good", hint: "a steady day" },
  { key: "okay", label: "Okay", hint: "nothing to report" },
  { key: "low", label: "A little low", hint: "worth being gentle" },
  { key: "unwell", label: "Unwell", hint: "the family should know" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];
