# On-device health relay

KinOS can relay a loved one's vitals from the phone they already carry — Apple
Health on iOS, Health Connect on Android — into their Orbit. The phone reads the
numbers locally; only the readings the family has consented to travel to KinOS,
and the database (RLS) decides who may write for whom.

The KinOS side is done and ships in this app:

- `lib/health.ts` — the provider interface, a cursor so each relay only sends
  what's new, idempotent batched upload (`relayHealth`).
- `lib/api.ts` — `api.relayHealthReadings(...)` → `POST /api/v1/health/readings`.
- `lib/use-health-relay.ts` — `useHealthRelay(subjectId)` for a "Sync health"
  button on any screen.

What's left is linking a **native** health module, which needs a custom dev
build (`expo prebuild` / EAS) — it can't run in Expo Go. KinOS core never
depends on the native module, so the app builds and typechecks without one;
until an adapter is registered, `relayHealth` reports `health-not-available`.

## Wiring an adapter

Install the platform module (in a dev build), then register an adapter at
startup — e.g. in `app/_layout.tsx` — that maps native samples into the
`HealthSample` shape and calls `registerHealthProvider(...)`. Every sample must
carry a stable `externalId` (the native record UUID) so re-sends de-duplicate,
and a `takenAt` ISO timestamp so the cursor can advance.

### iOS — HealthKit (`react-native-health`)

```ts
import AppleHealthKit from "react-native-health";
import { registerHealthProvider, type HealthSample } from "@/lib/health";

registerHealthProvider({
  source: "apple_health",
  isAvailable: () => new Promise((res) =>
    AppleHealthKit.isAvailable((_e, ok) => res(Boolean(ok)))),
  requestAuthorization: (metrics) => new Promise((res) => {
    const read = metrics.flatMap((m) => HEALTHKIT_PERMS[m] ?? []);
    AppleHealthKit.initHealthKit({ permissions: { read, write: [] } }, (e) => res(!e));
  }),
  readSamples: async (metrics, sinceIso) => {
    const out: HealthSample[] = [];
    for (const metric of metrics) {
      const rows = await readHealthKitMetric(metric, sinceIso); // per-metric query
      for (const r of rows) {
        out.push({
          metric,
          value: toValue(metric, r),           // e.g. { systolic, diastolic } or { value }
          unit: r.unit,
          takenAt: new Date(r.endDate).toISOString(),
          externalId: r.id ?? r.uuid,
          device: r.sourceName ? { name: r.sourceName } : undefined,
        });
      }
    }
    return out;
  },
});
```

### Android — Health Connect (`react-native-health-connect`)

```ts
import { initialize, requestPermission, readRecords } from "react-native-health-connect";
import { registerHealthProvider, type HealthSample } from "@/lib/health";

registerHealthProvider({
  source: "health_connect",
  isAvailable: () => initialize().then(Boolean).catch(() => false),
  requestAuthorization: (metrics) =>
    requestPermission(metrics.flatMap((m) => HC_PERMS[m] ?? []))
      .then((g) => g.length > 0).catch(() => false),
  readSamples: async (metrics, sinceIso) => {
    const filter = { timeRangeFilter: { operator: "after", startTime: sinceIso } } as const;
    const out: HealthSample[] = [];
    for (const metric of metrics) {
      const { records } = await readRecords(HC_RECORD_TYPE[metric], filter);
      for (const rec of records) {
        out.push({
          metric,
          value: toValue(metric, rec),
          takenAt: new Date(rec.time ?? rec.endTime).toISOString(),
          externalId: rec.metadata?.id,
          device: rec.metadata?.device ? { ...rec.metadata.device } : undefined,
        });
      }
    }
    return out;
  },
});
```

## Metric value shapes

The server accepts `value` as a small numeric map; match these keys:

| metric           | `value`                        | `unit`     |
| ---------------- | ------------------------------ | ---------- |
| `blood_pressure` | `{ systolic, diastolic }`      | `mmHg`     |
| `heart_rate`     | `{ value }`                    | `bpm`      |
| `spo2`           | `{ value }` (0–100)            | `%`        |
| `steps`          | `{ value }`                    | `count`    |
| `sleep_minutes`  | `{ value }`                    | `min`      |
| `weight`         | `{ value }`                    | `kg`       |
| `glucose`        | `{ value }`                    | `mmol/L`   |

## Consent

The relay does not override consent. A member can only write health readings
for a subject they hold a `health` (or `full`) consent grant on — enforced by
Postgres on every insert, exactly as for the web. Turn a metric's share level
down in Settings and it stops contributing to the family-visible brief, even
while it keeps flowing for the record.
