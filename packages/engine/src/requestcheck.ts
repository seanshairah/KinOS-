/**
 * Request Check — a family member asks; the person at the centre decides.
 *
 * Two ideas keep this honest:
 *
 *  1. Capability, never assumption. Devices differ wildly in what they can
 *     do on request. Every connector declares its capabilities and the
 *     product only offers checks a connected source can actually serve —
 *     with manual entry and a caregiver's word always available as the
 *     human fallback.
 *
 *  2. Consent in the shape of the flow. Nothing is read until the person
 *     shares. A request can wait, be declined, or quietly expire — and a
 *     "no" is a complete answer, never an alarm on its own.
 */

export const CHECK_TYPES = [
  "quick",
  "heart_rate",
  "blood_pressure",
  "spo2",
  "temperature",
  "movement",
  "sleep",
  "medication",
  "manual_checkin",
  "caregiver_confirm",
] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export type CheckStatus =
  | "pending"
  | "later"
  | "shared"
  | "declined"
  | "expired"
  | "cancelled";

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  quick: "Quick wellness check",
  heart_rate: "Heart rate",
  blood_pressure: "Blood pressure",
  spo2: "Oxygen",
  temperature: "Temperature",
  movement: "Recent movement",
  sleep: "Last night's sleep",
  medication: "Medication status",
  manual_checkin: "A simple check-in",
  caregiver_confirm: "A caregiver's confirmation",
};

export type ConnectorProvider =
  | "apple_health"
  | "health_connect"
  | "samsung_health"
  | "withings"
  | "bluetooth_device"
  | "manual"
  | "caregiver";

export interface ConnectorCapabilities {
  supportedMetrics: CheckType[];
  /** Can this source produce a fresh reading on request (vs. only the latest sync)? */
  canRequestLiveCheck: boolean;
  canReadLatest: boolean;
  /** True when the person must approve on their own device before anything is read. */
  requiresUserApproval: boolean;
}

/**
 * What each provider can honestly offer. Phone health stores sync recent
 * data but cannot squeeze a cuff remotely; only the human paths can
 * produce any answer on demand.
 */
export const CONNECTOR_CAPABILITIES: Record<ConnectorProvider, ConnectorCapabilities> = {
  apple_health: {
    supportedMetrics: ["quick", "heart_rate", "spo2", "movement", "sleep"],
    canRequestLiveCheck: false,
    canReadLatest: true,
    requiresUserApproval: true,
  },
  health_connect: {
    supportedMetrics: ["quick", "heart_rate", "spo2", "movement", "sleep"],
    canRequestLiveCheck: false,
    canReadLatest: true,
    requiresUserApproval: true,
  },
  samsung_health: {
    supportedMetrics: ["quick", "heart_rate", "movement", "sleep"],
    canRequestLiveCheck: false,
    canReadLatest: true,
    requiresUserApproval: true,
  },
  withings: {
    supportedMetrics: ["quick", "heart_rate", "blood_pressure", "sleep"],
    canRequestLiveCheck: false,
    canReadLatest: true,
    requiresUserApproval: true,
  },
  bluetooth_device: {
    supportedMetrics: ["blood_pressure", "spo2", "temperature"],
    canRequestLiveCheck: false,
    canReadLatest: false, // architecture placeholder: paired readers arrive later
    requiresUserApproval: true,
  },
  manual: {
    supportedMetrics: [...CHECK_TYPES],
    canRequestLiveCheck: true, // a person can always be asked
    canReadLatest: false,
    requiresUserApproval: true,
  },
  caregiver: {
    supportedMetrics: ["quick", "temperature", "medication", "caregiver_confirm"],
    canRequestLiveCheck: true,
    canReadLatest: false,
    requiresUserApproval: false, // the caregiver answers for what they did, not for the person
  },
};

export interface ConnectionSnapshot {
  provider: ConnectorProvider;
  status: "active" | "paused" | "disconnected";
  permissionStatus: "granted" | "partial" | "pending" | "revoked";
  lastSyncedAt?: string | null;
}

/** The human paths that exist for every orbit, connected or not. */
const ALWAYS_AVAILABLE: ConnectionSnapshot[] = [
  { provider: "manual", status: "active", permissionStatus: "granted" },
  { provider: "caregiver", status: "active", permissionStatus: "granted" },
];

/**
 * Which check types the family can offer for this person right now,
 * given what is actually connected and permitted.
 */
export function availableCheckTypes(connections: ConnectionSnapshot[]): CheckType[] {
  const usable = [...connections, ...ALWAYS_AVAILABLE].filter(
    (c) => c.status === "active" && c.permissionStatus !== "revoked",
  );
  const types = new Set<CheckType>();
  for (const c of usable) {
    for (const t of CONNECTOR_CAPABILITIES[c.provider].supportedMetrics) types.add(t);
  }
  return CHECK_TYPES.filter((t) => types.has(t));
}

/** Which connected source would serve a given check, if any. */
export function sourceFor(
  type: CheckType,
  connections: ConnectionSnapshot[],
): ConnectorProvider {
  const usable = [...connections, ...ALWAYS_AVAILABLE].filter(
    (c) => c.status === "active" && c.permissionStatus !== "revoked",
  );
  const device = usable.find(
    (c) =>
      c.provider !== "manual" &&
      c.provider !== "caregiver" &&
      CONNECTOR_CAPABILITIES[c.provider].supportedMetrics.includes(type) &&
      CONNECTOR_CAPABILITIES[c.provider].canReadLatest,
  );
  if (device) return device.provider;
  if (CONNECTOR_CAPABILITIES.caregiver.supportedMetrics.includes(type)) {
    const caregiver = usable.find((c) => c.provider === "caregiver");
    if (caregiver && type === "caregiver_confirm") return "caregiver";
  }
  return "manual";
}

/** Legal lifecycle moves; anything else is a programming error upstream. */
const TRANSITIONS: Record<CheckStatus, CheckStatus[]> = {
  pending: ["later", "shared", "declined", "expired", "cancelled"],
  later: ["shared", "declined", "expired", "cancelled"],
  shared: [],
  declined: [],
  expired: [],
  cancelled: [],
};

export function canTransitionCheck(from: CheckStatus, to: CheckStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** The words the person at the centre sees. Warm, short, no pressure. */
export function composeCheckPrompt(
  requesterName: string,
  type: CheckType,
  message?: string | null,
): string {
  const what =
    type === "quick" || type === "manual_checkin"
      ? "a quick wellness check"
      : CHECK_TYPE_LABELS[type].toLowerCase();
  const ask = `${requesterName} is asking for ${what}.`;
  return message ? `${ask} “${message}”` : ask;
}

/** How a response reads back to the family — a "no" stays a calm sentence. */
export function describeCheckStatus(
  status: CheckStatus,
  subjectName: string,
): string {
  switch (status) {
    case "pending":
      return `Waiting for ${subjectName} to share.`;
    case "later":
      return `${subjectName} asked to be reminded later.`;
    case "shared":
      return `Check received.`;
    case "declined":
      return `${subjectName} chose not to share this check.`;
    case "expired":
      return `The request lapsed quietly — ask again when it suits, or ask someone nearby to check in person.`;
    case "cancelled":
      return `The request was withdrawn.`;
  }
}

export interface CheckMetricReading {
  metric: string;
  value: number;
  unit?: string;
  /** Subject's own baseline, when one exists — never a population rulebook. */
  baselineMean?: number;
  baselineStddev?: number;
}

export interface CheckResultSummary {
  summary: string;
  worthACheck: boolean;
}

const METRIC_WORDS: Record<string, string> = {
  heart_rate: "heart rate",
  systolic: "blood pressure",
  diastolic: "blood pressure",
  spo2: "oxygen",
  temperature: "temperature",
  steps: "movement",
  sleep_minutes: "sleep",
};

/**
 * Turn shared readings into one calm sentence. Judged only against the
 * person's own rhythm; with no baseline there is nothing to compare, so
 * the answer is simply what was shared. Never a verdict, never a number
 * dressed as a diagnosis — "worth a check" is as far as it goes.
 */
export function summarizeCheckResult(
  subjectName: string,
  readings: CheckMetricReading[],
): CheckResultSummary {
  if (readings.length === 0) {
    return { summary: `${subjectName} shared a check-in — nothing to add.`, worthACheck: false };
  }
  const off = readings.filter((r) => {
    if (r.baselineMean == null || r.baselineStddev == null || r.baselineStddev === 0) return false;
    return Math.abs(r.value - r.baselineMean) / r.baselineStddev >= 2;
  });
  if (off.length === 0) {
    return {
      summary: `${subjectName} shared a check — everything sits inside their usual rhythm.`,
      worthACheck: false,
    };
  }
  const words = [...new Set(off.map((r) => METRIC_WORDS[r.metric] ?? r.metric.replace(/_/g, " ")))];
  return {
    summary:
      `${subjectName} shared a check. ${capitalize(joinWords(words))} ` +
      `${words.length === 1 ? "sits" : "sit"} outside their usual range — worth a check, ` +
      `not an alarm. If you're concerned, contact a healthcare professional.`,
    worthACheck: true,
  };
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Is the person resting right now? Non-urgent asks wait until then. */
export function inQuietMode(quietUntil: string | null | undefined, now: Date): boolean {
  return Boolean(quietUntil && new Date(quietUntil).getTime() > now.getTime());
}

export function quietModeLine(
  subjectName: string,
  quietUntil: string,
  timezone: string,
  note?: string | null,
): string {
  const at = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(quietUntil));
  return note?.trim()
    ? `${subjectName} is resting — ${note.trim()}. Non-urgent requests resume at ${at}.`
    : `${subjectName} is resting. Non-urgent requests resume at ${at}.`;
}
