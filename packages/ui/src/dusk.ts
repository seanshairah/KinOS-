/**
 * The Dusk design tokens as plain TypeScript — the same source of truth
 * as tokens.css, importable anywhere a stylesheet can't reach (React
 * Native, emails, canvas). Colour is a status language: warm neutral
 * when nothing is wrong; ember only ever means attention.
 */

export const DUSK = {
  ink: "#211D19",
  inkSoft: "#5A534B",
  inkFaint: "#928A7E",

  paper: "#F6F2EC",
  paper2: "#FBF8F3",
  paper3: "#FEFCF9",

  line: "#E6DFD3",
  line2: "#D8CFC0",

  dusk: "#35335F",
  dusk2: "#4E4B90",
  dusk3: "#6C69B8",
  halo: "#A9A7E0",
  duskInk: "#EDEBF6",

  night: "#2C2A4F",

  ember: "#D98A3D",
  emberSoft: "#F0D9BE",

  calm: "#4E9E7E",
  calmSoft: "#CFE6DB",

  urgent: "#C25642",
} as const;

export const RADII = {
  sm: 8,
  card: 13,
  lg: 20,
  pill: 999,
} as const;

export type DuskColor = keyof typeof DUSK;
