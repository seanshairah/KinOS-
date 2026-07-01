/**
 * Feature flags for phased rollout. Env-driven so a deploy can flip them
 * without a code change; defaults are the safe MVP posture.
 */

export type Flag =
  | "money_pot"
  | "family_record_recall"
  | "emergency_layer"
  | "caregiver_visits"
  | "patterns"
  | "billing"
  | "whatsapp_channel"
  | "wearable_connectors";

const DEFAULTS: Record<Flag, boolean> = {
  money_pot: true,
  family_record_recall: true,
  emergency_layer: true,
  caregiver_visits: true,
  patterns: true,
  billing: true,
  whatsapp_channel: false,
  wearable_connectors: false,
};

export function flagEnabled(flag: Flag): boolean {
  const env = process.env[`FLAG_${flag.toUpperCase()}`];
  if (env === "1" || env === "true") return true;
  if (env === "0" || env === "false") return false;
  return DEFAULTS[flag];
}
