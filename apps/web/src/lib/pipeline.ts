import {
  normalizeCapture,
  runAttentionRules,
  type AttentionContext,
  type Baseline,
  type LifeSignal,
} from "@kinos/engine";
import { embedText, extract, isModelConfigured } from "@kinos/ai";
import { withService, withUser, type DbClient } from "@kinos/db";
import { notifyMember } from "./notify";

/**
 * The Life Signals pipeline: capture → normalize → interpret → decide →
 * remember. Capture writes run under the user's RLS context; the decide
 * and remember stages run service-side per subject and are idempotent —
 * attention dedupe keys make re-runs no-ops, and failures land in
 * pipeline_dead_letter for review instead of vanishing.
 */

export interface CaptureInput {
  subjectId: string;
  memberId?: string;
  signalType: string;
  source: string;
  value?: unknown;
  unit?: string;
  privacyLevel?: string;
  occurredAt?: string;
}

export interface CaptureResult {
  ok: boolean;
  signalId?: string;
  reason?: string;
}

export async function captureSignal(
  userId: string,
  input: CaptureInput,
): Promise<CaptureResult> {
  return runCapture((fn) => withUser(userId, fn), input);
}

/**
 * Capture on behalf of the system — an inbound SMS reply or a device
 * webhook, where nobody is signed in. Same normalize → insert → decide
 * pipeline, but the write runs service-side: RLS is bypassed deliberately,
 * so callers MUST have authenticated the sender themselves first (e.g. a
 * verified Twilio signature plus a phone-number match).
 */
export async function captureSignalAsService(input: CaptureInput): Promise<CaptureResult> {
  return runCapture((fn) => withService(fn), input);
}

async function runCapture(
  run: <T>(fn: (db: DbClient) => Promise<T>) => Promise<T>,
  input: CaptureInput,
): Promise<CaptureResult> {
  const normalized = normalizeCapture(input, new Date());
  if (!normalized.ok) return { ok: false, reason: normalized.reason };
  const s = normalized.signal;

  try {
    const signalId = await run(async (db) => {
      const res = await db.query(
        `insert into life_signal
           (subject_id, member_id, signal_type, source, value, unit, privacy_level, occurred_at, raw)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          s.subjectId,
          s.memberId ?? null,
          s.signalType,
          s.source,
          s.value === null ? null : JSON.stringify(s.value),
          s.unit ?? null,
          s.privacyLevel,
          s.occurredAt,
          JSON.stringify(input),
        ],
      );
      return res.rows[0]!.id as string;
    });

    // Decide + baseline stages run service-side; a failure here never loses
    // the captured signal.
    await runDecideStage(s.subjectId).catch((err) =>
      deadLetter(signalId, "decide", err),
    );
    if (s.signalType === "checkin") {
      await recordActivation(s.subjectId, "first_checkin");
      await updateCheckinBaseline(s.subjectId, s.occurredAt);
    }
    if (s.signalType === "metric") {
      await updateMetricBaseline(s.subjectId, s.value).catch(() => {});
    }

    return { ok: true, signalId };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error && /policy|permission|denied/i.test(err.message)
        ? "You don't have access to add signals for this person."
        : "The signal couldn't be saved. Try again.",
    };
  }
}

/**
 * Magic capture: a voice-note transcript (or receipt/document text) becomes
 * structured signals with confidence, follow-up duties, and a record entry.
 */
export async function captureVoiceNote(
  userId: string,
  params: {
    subjectId: string;
    memberId: string;
    text: string;
    audioUrl?: string;
    kind?: "voice_note" | "receipt" | "document";
  },
): Promise<CaptureResult> {
  const kind = params.kind ?? "voice_note";
  const base = await captureSignal(userId, {
    subjectId: params.subjectId,
    memberId: params.memberId,
    signalType: kind === "voice_note" ? "voice_note" : kind,
    source: kind === "voice_note" ? "caregiver_voice_note" : `${kind}_scan`,
    value: { text: params.text, audio_url: params.audioUrl ?? null },
  });
  if (!base.ok || !base.signalId) return base;

  if (!isModelConfigured()) {
    // Degraded mode: queue for review rather than pretending.
    await withService((db) =>
      db.query(
        `insert into signal_interpretation (signal_id, label, confidence, model)
         values ($1, 'needs_review', 0, 'unavailable')`,
        [base.signalId],
      ),
    );
    return base;
  }

  try {
    const result = await extract(params.text, kind === "voice_note" ? "voice_note" : kind);
    if (!result) {
      await deadLetter(base.signalId, "interpret", new Error("extraction returned nothing"));
      return base;
    }

    await withService(async (db) => {
      for (const sig of result.signals) {
        await db.query(
          `insert into signal_interpretation (signal_id, label, confidence, extracted, model)
           values ($1, $2, $3, $4, 'internal')`,
          [
            base.signalId,
            sig.label,
            sig.confidence,
            JSON.stringify({ type: sig.type, value: sig.value, unit: sig.unit }),
          ],
        );
      }
      for (const followUp of result.followUps) {
        await db.query(
          `insert into duty (subject_id, title, note, priority, created_by)
           values ($1, $2, $3, 'normal', $4)`,
          [params.subjectId, followUp.title, followUp.reason, params.memberId],
        );
      }
      const record = await db.query(
        `insert into family_record_item (subject_id, kind, title, body, author_member_id)
         values ($1, 'note', $2, $3, $4) returning id`,
        [
          params.subjectId,
          result.summary.slice(0, 120),
          `${result.summary}\n\nFrom a ${kind.replace("_", " ")}: "${params.text.slice(0, 600)}"`,
          params.memberId,
        ],
      );
      await rememberRecordItem(db, params.subjectId, record.rows[0]!.id, result.summary + " " + params.text);
    });

    await runDecideStage(params.subjectId).catch((err) =>
      deadLetter(base.signalId!, "decide", err),
    );
  } catch (err) {
    await deadLetter(base.signalId, "interpret", err);
  }
  return base;
}

/** Remember: index a record item into Family Memory (pgvector). */
export async function rememberRecordItem(
  db: DbClient,
  subjectId: string,
  recordItemId: string,
  content: string,
): Promise<void> {
  const embedding = await embedText(content.slice(0, 4000));
  await db.query(
    `insert into record_embedding (subject_id, record_item_id, content, embedding)
     values ($1, $2, $3, $4)`,
    [subjectId, recordItemId, content.slice(0, 4000), `[${embedding.join(",")}]`],
  );
}

/** Decide: evaluate attention rules for one subject, idempotently. */
export async function runDecideStage(subjectId: string): Promise<void> {
  await withService(async (db) => {
    const subject = await db.query(
      `select * from care_subject where id = $1`,
      [subjectId],
    );
    const row = subject.rows[0];
    if (!row) return;

    // Sequential on purpose: one pg client handles one query at a time.
    const signals = await db.query(
          `select * from life_signal where subject_id = $1
             and occurred_at > now() - interval '48 hours'
           order by occurred_at desc limit 200`,
          [subjectId],
        );
    const interps = await db.query(
          `select i.* from signal_interpretation i
           join life_signal l on l.id = i.signal_id
           where l.subject_id = $1 and l.occurred_at > now() - interval '7 days'`,
          [subjectId],
        );
    const duties = await db.query(
          `select d.*, m.display_name as owner_name from duty d
           left join family_member m on m.id = d.owner_member_id
           where d.subject_id = $1 and d.status in ('open','late')`,
          [subjectId],
        );
    const meds = await db.query(`select * from medication where subject_id = $1 and active`, [subjectId]);
    const doses = await db.query(
          `select * from dose_log where subject_id = $1 and at > now() - interval '36 hours'`,
          [subjectId],
        );
    const appts = await db.query(
          `select a.*, m.display_name as transport_owner_name from appointment a
           left join family_member m on m.id = a.transport_owner_member_id
           where a.subject_id = $1 and a.starts_at between now() and now() + interval '3 days'`,
          [subjectId],
        );
    const visits = await db.query(
          `select * from caregiver_visit where subject_id = $1
             and check_in > now() - interval '7 days'`,
          [subjectId],
        );
    const baselines = await db.query(`select * from baseline_metric where subject_id = $1`, [subjectId]);
    const open = await db.query(
          `select dedupe_key from attention_event
           where subject_id = $1 and status in ('open','ack','snoozed')
             and dedupe_key is not null`,
          [subjectId],
        );
    // Steps counted so far in the subject's local day — null when no
    // wearable reported, and absence of data is never alarming.
    const steps = await db.query(
          `select max((value->>'value')::numeric)::int as steps
           from health_reading
           where subject_id = $1 and metric = 'steps'
             and (taken_at at time zone $2)::date = (now() at time zone $2)::date`,
          [subjectId, row.timezone],
        );
    // When any family member last left a signal here, ever.
    const lastTouch = await db.query(
          `select max(occurred_at) as at from life_signal
           where subject_id = $1 and member_id is not null`,
          [subjectId],
        );

    const ctx: AttentionContext = {
      subject: {
        id: row.id,
        displayName: row.display_name,
        kind: row.kind ?? "elder",
        timezone: row.timezone,
        expectedCheckinBy: row.expected_checkin_by,
        expectedVisitEveryHours: row.expected_visit_every_hours,
      },
      now: new Date(),
      recentSignals: signals.rows.map(
        (s): LifeSignal => ({
          id: s.id,
          subjectId: s.subject_id,
          memberId: s.member_id,
          signalType: s.signal_type,
          source: s.source,
          value: s.value,
          unit: s.unit,
          privacyLevel: s.privacy_level,
          occurredAt: new Date(s.occurred_at).toISOString(),
        }),
      ),
      interpretations: interps.rows.map((i) => ({
        signalId: i.signal_id,
        label: i.label,
        confidence: Number(i.confidence ?? 0),
      })),
      duties: duties.rows.map((d) => ({
        id: d.id,
        subjectId: d.subject_id,
        title: d.title,
        ownerMemberId: d.owner_member_id,
        ownerName: d.owner_name,
        dueAt: d.due_at ? new Date(d.due_at).toISOString() : null,
        status: d.status,
        priority: d.priority,
      })),
      medications: meds.rows.map((m) => ({
        id: m.id,
        subjectId: m.subject_id,
        name: m.name,
        dose: m.dose,
        times: (m.schedule?.times as string[] | undefined) ?? [],
        refillAt: m.refill_at ? String(m.refill_at).slice(0, 10) : null,
        active: m.active,
      })),
      doseLogs: doses.rows.map((d) => ({
        medicationId: d.medication_id,
        status: d.status,
        scheduledFor: d.scheduled_for ? new Date(d.scheduled_for).toISOString() : null,
        at: new Date(d.at).toISOString(),
      })),
      appointments: appts.rows.map((a) => ({
        id: a.id,
        subjectId: a.subject_id,
        kind: a.kind,
        title: a.title,
        location: a.location,
        startsAt: new Date(a.starts_at).toISOString(),
        transportOwnerMemberId: a.transport_owner_member_id,
        transportOwnerName: a.transport_owner_name,
        transportConfirmed: a.transport_confirmed,
      })),
      caregiverVisits: visits.rows.map((v) => ({
        subjectId: v.subject_id,
        checkIn: v.check_in ? new Date(v.check_in).toISOString() : null,
        checkOut: v.check_out ? new Date(v.check_out).toISOString() : null,
      })),
      baselines: baselines.rows.map(
        (b): Baseline => ({
          metric: b.metric,
          window: b.window,
          mean: Number(b.mean ?? 0),
          stddev: Number(b.stddev ?? 0),
          n: b.n,
        }),
      ),
      openAttentionKeys: new Set(open.rows.map((r) => r.dedupe_key as string)),
      todaysSteps: steps.rows[0]?.steps ?? null,
      lastFamilyTouchAt: lastTouch.rows[0]?.at
        ? new Date(lastTouch.rows[0].at).toISOString()
        : null,
    };

    const candidates = runAttentionRules(ctx);
    for (const c of candidates) {
      const inserted = await db.query(
        `insert into attention_event
           (subject_id, kind, severity, title, detail, owner_member_id, escalate_at, source_signal_id, dedupe_key)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (dedupe_key) where status in ('open','ack','snoozed') do nothing
         returning id, owner_member_id, title`,
        [
          c.subjectId,
          c.kind,
          c.severity,
          c.title,
          c.detail ?? null,
          c.ownerMemberId ?? null,
          c.escalateAt ?? null,
          c.sourceSignalId ?? null,
          c.dedupeKey,
        ],
      );
      const event = inserted.rows[0];
      if (event?.owner_member_id) {
        await notifyMember({
          memberId: event.owner_member_id,
          title: event.title,
          body: c.detail ?? undefined,
          link: "/app/attention",
          priority: c.severity === "urgent" ? "urgent" : "high",
        });
      }
    }
  });
}

/** Baseline: check-in time rhythm (minutes of day, 14d window). */
async function updateCheckinBaseline(subjectId: string, occurredAt: string): Promise<void> {
  const d = new Date(occurredAt);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  await upsertBaseline(subjectId, "checkin_time", minutes);
}

async function updateMetricBaseline(subjectId: string, value: unknown): Promise<void> {
  const v = value as { metric?: string; value?: number } | null;
  if (!v?.metric || typeof v.value !== "number") return;
  await upsertBaseline(subjectId, v.metric, v.value);
}

/** Welford update persisted as (mean, stddev, n). */
export async function upsertBaseline(subjectId: string, metric: string, value: number): Promise<void> {
  await withService(async (db) => {
    const existing = await db.query(
      `select mean, stddev, n from baseline_metric
       where subject_id = $1 and metric = $2 and "window" = '14d' for update`,
      [subjectId, metric],
    );
    const row = existing.rows[0];
    if (!row) {
      await db.query(
        `insert into baseline_metric (subject_id, metric, "window", mean, stddev, n)
         values ($1, $2, '14d', $3, 0, 1)`,
        [subjectId, metric, value],
      );
      return;
    }
    const n = row.n + 1;
    const oldMean = Number(row.mean ?? 0);
    const mean = oldMean + (value - oldMean) / n;
    // Recover m2 from stored stddev, apply Welford, store back.
    const m2 = Math.pow(Number(row.stddev ?? 0), 2) * Math.max(row.n - 1, 0) +
      (value - oldMean) * (value - mean);
    const stddev = n > 1 ? Math.sqrt(m2 / (n - 1)) : 0;
    await db.query(
      `update baseline_metric set mean = $3, stddev = $4, n = $5, updated_at = now()
       where subject_id = $1 and metric = $2 and "window" = '14d'`,
      [subjectId, metric, mean, stddev, n],
    );
  });
}

export async function recordActivation(
  subjectId: string,
  step: "first_checkin" | "first_duty" | "orbit_created" | "first_brief",
): Promise<void> {
  await withService(async (db) => {
    await db.query(
      `insert into activation_event (workspace_id, step)
       select workspace_id, $2 from care_subject where id = $1
       on conflict do nothing`,
      [subjectId, step],
    );
  });
}

async function deadLetter(signalId: string, stage: string, err: unknown): Promise<void> {
  await withService((db) =>
    db.query(
      `insert into pipeline_dead_letter (signal_id, stage, error)
       values ($1, $2, $3)`,
      [signalId, stage, err instanceof Error ? err.message : String(err)],
    ),
  ).catch(() => {});
}
