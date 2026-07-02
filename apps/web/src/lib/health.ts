import {
  reduceHealthReading,
  type Baseline,
  type HealthMetric,
  type HealthReading,
} from "@kinos/engine";
import { withService, withUser } from "@kinos/db";
import { notifyMember } from "./notify";
import { upsertBaseline } from "./pipeline";

/**
 * Health ingestion — readings in, calm out.
 *
 * Capture runs under the caller's RLS context (a manual entry, or the
 * mobile app relaying Apple Health / Health Connect), or service-side for
 * device-cloud webhooks. Reduction always runs service-side: readings are
 * compared to the person's baseline, an observation is written when a
 * range is drifting, and only a repeated pattern becomes an attention
 * event — which is what the family sees, without a single number leaving
 * the consent gate.
 */

export interface IncomingReading {
  metric: HealthMetric;
  value: Record<string, number>;
  unit?: string;
  takenAt?: string;
  externalId?: string;
  device?: Record<string, unknown>;
}

export interface HealthIngestResult {
  ok: boolean;
  stored: number;
  observations: number;
  attentionRaised: boolean;
  reason?: string;
}

/** Which baseline series a reading feeds (attention is defined against the person). */
function baselineSeries(reading: IncomingReading): { metric: string; value: number } | null {
  if (reading.metric === "blood_pressure") {
    return typeof reading.value.systolic === "number"
      ? { metric: "bp_systolic", value: reading.value.systolic }
      : null;
  }
  return typeof reading.value.value === "number"
    ? { metric: reading.metric, value: reading.value.value }
    : null;
}

/**
 * User-context capture: inserts run as the caller, so Postgres enforces
 * membership and role. Reduction follows service-side per reading.
 */
export async function ingestHealthReadings(
  userId: string,
  params: {
    subjectId: string;
    memberId: string;
    source: "manual" | "apple_health" | "health_connect";
    readings: IncomingReading[];
  },
): Promise<HealthIngestResult> {
  let ids: { id: string; reading: IncomingReading }[];
  try {
    ids = await withUser(userId, async (db) => {
      const out: { id: string; reading: IncomingReading }[] = [];
      for (const r of params.readings) {
        const res = await db.query(
          `insert into health_reading
             (subject_id, member_id, metric, value, unit, source, device, external_id, taken_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::timestamptz, now()))
           on conflict (source, external_id) where external_id is not null do nothing
           returning id`,
          [
            params.subjectId,
            params.memberId,
            r.metric,
            JSON.stringify(r.value),
            r.unit ?? null,
            params.source,
            r.device ? JSON.stringify(r.device) : null,
            r.externalId ?? null,
            r.takenAt ?? null,
          ],
        );
        if (res.rows[0]) out.push({ id: res.rows[0].id as string, reading: r });
      }
      return out;
    });
  } catch (err) {
    return {
      ok: false,
      stored: 0,
      observations: 0,
      attentionRaised: false,
      reason:
        err instanceof Error && /policy|permission|denied/i.test(err.message)
          ? "You don't have access to add health readings for this person."
          : "The readings couldn't be saved. Try again.",
    };
  }

  let observations = 0;
  let attentionRaised = false;
  for (const { id, reading } of ids) {
    const outcome = await reduceStoredReading(params.subjectId, id, reading).catch(
      () => ({ observation: false, attention: false }),
    );
    if (outcome.observation) observations += 1;
    if (outcome.attention) attentionRaised = true;
  }
  return { ok: true, stored: ids.length, observations, attentionRaised };
}

/**
 * Whether a device cloud is linked to this orbit. Service-side on purpose:
 * link rows carry tokens and have no app-role grants, so pages get a
 * boolean, never the row.
 */
export async function hasDeviceLink(subjectId: string): Promise<boolean> {
  return withService(async (db) => {
    const res = await db.query(
      `select 1 from health_source_link where subject_id = $1 and status = 'active' limit 1`,
      [subjectId],
    );
    return Boolean(res.rows[0]);
  });
}

/**
 * Service-context capture for device clouds (webhook-driven sources like
 * Withings): no user in the loop, so inserts run as the service after the
 * link itself established consent. Same dedupe, same reduction.
 */
export async function ingestServiceReadings(
  subjectId: string,
  source: "withings",
  readings: IncomingReading[],
): Promise<HealthIngestResult> {
  const ids = await withService(async (db) => {
    const out: { id: string; reading: IncomingReading }[] = [];
    for (const r of readings) {
      const res = await db.query(
        `insert into health_reading
           (subject_id, metric, value, unit, source, device, external_id, taken_at)
         values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()))
         on conflict (source, external_id) where external_id is not null do nothing
         returning id`,
        [
          subjectId,
          r.metric,
          JSON.stringify(r.value),
          r.unit ?? null,
          source,
          r.device ? JSON.stringify(r.device) : null,
          r.externalId ?? null,
          r.takenAt ?? null,
        ],
      );
      if (res.rows[0]) out.push({ id: res.rows[0].id as string, reading: r });
    }
    return out;
  });

  let observations = 0;
  let attentionRaised = false;
  for (const { id, reading } of ids) {
    const outcome = await reduceStoredReading(subjectId, id, reading).catch(
      () => ({ observation: false, attention: false }),
    );
    if (outcome.observation) observations += 1;
    if (outcome.attention) attentionRaised = true;
  }
  return { ok: true, stored: ids.length, observations, attentionRaised };
}

/**
 * Service-side reduction of one stored reading: history + baseline in,
 * observation / attention out. Idempotent — attention dedupe keys make
 * re-runs no-ops, and the baseline update happens exactly once per call.
 */
export async function reduceStoredReading(
  subjectId: string,
  readingId: string,
  reading: IncomingReading,
): Promise<{ observation: boolean; attention: boolean }> {
  const series = baselineSeries(reading);

  const result = await withService(async (db) => {
    const subjectRes = await db.query(
      `select id, display_name from care_subject where id = $1`,
      [subjectId],
    );
    const subject = subjectRes.rows[0];
    if (!subject) return { observation: false, attention: false };

    const recentRes = await db.query(
      `select id, metric, value, taken_at from health_reading
       where subject_id = $1 and metric = $2 and id <> $3
         and taken_at > now() - interval '14 days'
       order by taken_at desc limit 60`,
      [subjectId, reading.metric, readingId],
    );
    const baselineRes = series
      ? await db.query(
          `select metric, "window", mean, stddev, n from baseline_metric
           where subject_id = $1 and metric = $2 and "window" = '14d'`,
          [subjectId, series.metric],
        )
      : { rows: [] };
    const openRes = await db.query(
      `select dedupe_key from attention_event
       where subject_id = $1 and status in ('open','ack','snoozed') and dedupe_key is not null`,
      [subjectId],
    );

    const baselineRow = baselineRes.rows[0];
    const baseline: Baseline | undefined = baselineRow
      ? {
          metric: baselineRow.metric,
          window: baselineRow.window,
          mean: Number(baselineRow.mean ?? 0),
          stddev: Number(baselineRow.stddev ?? 0),
          n: baselineRow.n,
        }
      : undefined;

    const reduction = reduceHealthReading({
      subject: { id: subject.id, displayName: subject.display_name },
      now: new Date(),
      reading: {
        id: readingId,
        metric: reading.metric,
        value: reading.value,
        takenAt: reading.takenAt ?? new Date().toISOString(),
      },
      recent: recentRes.rows.map(
        (r): HealthReading => ({
          id: r.id,
          metric: r.metric,
          value: r.value as Record<string, number>,
          takenAt: new Date(r.taken_at).toISOString(),
        }),
      ),
      baseline,
      openAttentionKeys: new Set(openRes.rows.map((r) => r.dedupe_key as string)),
    });

    let attentionEventId: string | null = null;
    let notify: { memberId: string; title: string; detail?: string } | null = null;
    if (reduction.attention) {
      const c = reduction.attention;
      const inserted = await db.query(
        `insert into attention_event
           (subject_id, kind, severity, title, detail, escalate_at, dedupe_key)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (dedupe_key) where status in ('open','ack','snoozed') do nothing
         returning id, owner_member_id`,
        [c.subjectId, c.kind, c.severity, c.title, c.detail ?? null, c.escalateAt ?? null, c.dedupeKey],
      );
      const event = inserted.rows[0];
      if (event) {
        attentionEventId = event.id as string;
        if (event.owner_member_id) {
          notify = { memberId: event.owner_member_id, title: c.title, detail: c.detail };
        }
      }
    }

    if (reduction.observation) {
      const o = reduction.observation;
      await db.query(
        `insert into health_observation
           (subject_id, metric, kind, summary, detail, "window", source, attention_event_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          subjectId,
          o.metric,
          o.kind,
          o.summary,
          o.detail ?? null,
          o.window ?? null,
          JSON.stringify({ reading_ids: o.readingIds }),
          attentionEventId,
        ],
      );
    }

    return {
      observation: Boolean(reduction.observation),
      attention: Boolean(attentionEventId),
      notify,
    };
  });

  if (series) await upsertBaseline(subjectId, series.metric, series.value).catch(() => {});
  if ("notify" in result && result.notify) {
    await notifyMember({
      memberId: result.notify.memberId,
      title: result.notify.title,
      body: result.notify.detail,
      link: "/app/attention",
      priority: "high",
    }).catch(() => {});
  }
  return { observation: result.observation, attention: result.attention };
}
