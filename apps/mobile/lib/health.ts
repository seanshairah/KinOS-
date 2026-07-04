import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, type HealthReadingPayload } from "./api";

/**
 * On-device health relay — the bridge between Apple Health (HealthKit) or
 * Android Health Connect and a loved one's Orbit. The phone reads the numbers
 * locally and relays them to KinOS; the server's RLS decides who may write for
 * whom, and the reducer decides — calmly — whether any of it is worth a word.
 *
 * The native read itself lives behind a small provider interface, registered
 * at startup by the platform adapter (see HEALTH_RELAY.md). KinOS core never
 * hard-depends on a native health module, so the app builds and typechecks
 * with or without one linked; unlinked, the relay is simply unavailable.
 */

export type HealthMetric = HealthReadingPayload["metric"];

/** The default set we ask to read — the vitals that matter for an elder. */
export const DEFAULT_METRICS: HealthMetric[] = [
  "heart_rate",
  "blood_pressure",
  "steps",
  "sleep_minutes",
  "spo2",
  "weight",
];

/** One sample as the provider hands it back — already in the server's shape. */
export interface HealthSample extends HealthReadingPayload {
  takenAt: string; // providers must stamp the sample time
}

/**
 * What a platform adapter must implement. Kept deliberately small: can we read,
 * may we read, and give me everything since a timestamp.
 */
export interface HealthProvider {
  readonly source: "apple_health" | "health_connect";
  isAvailable(): Promise<boolean>;
  requestAuthorization(metrics: HealthMetric[]): Promise<boolean>;
  readSamples(metrics: HealthMetric[], sinceIso: string): Promise<HealthSample[]>;
}

const noopProvider: HealthProvider = {
  source: Platform.OS === "ios" ? "apple_health" : "health_connect",
  isAvailable: async () => false,
  requestAuthorization: async () => false,
  readSamples: async () => [],
};

let provider: HealthProvider = noopProvider;

/** Called once by the platform adapter at startup to plug in the native read. */
export function registerHealthProvider(p: HealthProvider): void {
  provider = p;
}

export function getHealthProvider(): HealthProvider {
  return provider;
}

// Where we left off, per subject, so each relay only sends what's new.
const cursorKey = (subjectId: string) => `kinos.health.cursor.${subjectId}`;
const DEFAULT_LOOKBACK_DAYS = 7;

async function readCursor(subjectId: string): Promise<string> {
  const stored = await SecureStore.getItemAsync(cursorKey(subjectId)).catch(() => null);
  if (stored) return stored;
  const since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86400_000);
  return since.toISOString();
}

async function writeCursor(subjectId: string, iso: string): Promise<void> {
  await SecureStore.setItemAsync(cursorKey(subjectId), iso).catch(() => {});
}

export interface RelayResult {
  ok: boolean;
  reason?: string;
  stored: number;
  sent: number;
}

/**
 * Read everything new from the device and relay it to the subject's Orbit.
 * Idempotent by design: samples carry an externalId, so a sample sent twice is
 * de-duplicated server-side, and the cursor only advances past what was
 * accepted. Batches of 100 to match the endpoint's cap.
 */
export async function relayHealth(
  token: string,
  subjectId: string,
  metrics: HealthMetric[] = DEFAULT_METRICS,
): Promise<RelayResult> {
  const p = getHealthProvider();
  if (!(await p.isAvailable())) {
    return { ok: false, reason: "health-not-available", stored: 0, sent: 0 };
  }
  if (!(await p.requestAuthorization(metrics))) {
    return { ok: false, reason: "health-not-authorized", stored: 0, sent: 0 };
  }

  const since = await readCursor(subjectId);
  const samples = (await p.readSamples(metrics, since)).sort((a, b) =>
    a.takenAt.localeCompare(b.takenAt),
  );
  if (samples.length === 0) return { ok: true, stored: 0, sent: 0 };

  let stored = 0;
  let sent = 0;
  for (let i = 0; i < samples.length; i += 100) {
    const batch = samples.slice(i, i + 100);
    try {
      const res = await api.relayHealthReadings(token, subjectId, p.source, batch);
      stored += res.stored;
      sent += batch.length;
      // Advance only across batches we actually delivered, so the next relay
      // resumes exactly where this one stopped.
      await writeCursor(subjectId, batch[batch.length - 1]!.takenAt);
    } catch (err) {
      // Stop at the first failed batch; the cursor holds at the last success,
      // so the next relay resumes exactly where this one stopped.
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "relay-failed",
        stored,
        sent,
      };
    }
  }
  return { ok: true, stored, sent };
}
