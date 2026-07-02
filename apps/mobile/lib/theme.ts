import { DUSK, RADII } from "@kinos/ui/dusk";

/**
 * The Dusk system on native — same tokens as the web, plus the real
 * brand faces: Newsreader for the human voice, Inter for structure,
 * IBM Plex Mono for time and data. Loaded in the root layout.
 */
export const T = {
  ...DUSK,
  r: RADII,
  serif: "Newsreader_400Regular",
  serifLight: "Newsreader_300Light",
  serifItalic: "Newsreader_400Regular_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  mono: "IBMPlexMono_400Regular",
} as const;

export const MOODS = [
  { key: "good", label: "Good", hint: "a steady day", color: DUSK.calm },
  { key: "okay", label: "Okay", hint: "nothing to report", color: DUSK.halo },
  { key: "low", label: "A little low", hint: "worth being gentle", color: DUSK.dusk3 },
  { key: "unwell", label: "Unwell", hint: "the family should know", color: DUSK.ember },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

/** Time-aware greeting — the app knows what part of the day you share. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "The small hours";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Goodnight";
}
