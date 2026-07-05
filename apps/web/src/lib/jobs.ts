import {
  composeBriefActions,
  composeBriefFacts,
  composeCalmDigest,
  decideEscalation,
  detectPattern,
  type BriefInput,
} from "@kinos/engine";
import { writeBrief } from "@kinos/ai";
import { withService } from "@kinos/db";
import { runDecideStage } from "./pipeline";
import { notifyMember } from "./notify";
import { sendSmsCheckinPrompts } from "./sms-checkin";

/**
 * Scheduled jobs, invoked by Vercel Cron through /api/jobs/* with a shared
 * secret. All idempotent: briefs are one-per-subject-per-kind-per-day,
 * attention dedupes by key, escalation advances a timestamp.
 */

/** Twice daily: the Daily Brief for every Orbit. */
export async function generateBriefs(kind: "morning" | "evening"): Promise<number> {
  return withService(async (db) => {
    const subjects = await db.query(`select * from care_subject`);
    let written = 0;

    for (const subject of subjects.rows) {
      const exists = await db.query(
        `select 1 from daily_brief
         where subject_id = $1 and kind = $2 and for_date = current_date`,
        [subject.id, kind],
      );
      if (exists.rows[0]) continue;

      // Sequential on purpose: one pg client handles one query at a time.
      const signals = await db.query(
          `select * from life_signal
           where subject_id = $1 and occurred_at >= date_trunc('day', now())
           order by occurred_at desc`,
          [subject.id],
        );
      const attention = await db.query(
          `select a.*, m.display_name as owner_name from attention_event a
           left join family_member m on m.id = a.owner_member_id
           where a.subject_id = $1 and a.status = 'open'
           order by case a.severity when 'urgent' then 0 when 'attention' then 1 else 2 end`,
          [subject.id],
        );
      const appts = await db.query(
          `select a.*, m.display_name as transport_owner_name from appointment a
           left join family_member m on m.id = a.transport_owner_member_id
           where a.subject_id = $1 and a.starts_at between now() and now() + interval '3 days'
           order by a.starts_at limit 4`,
          [subject.id],
        );
      const duties = await db.query(
          `select d.*, m.display_name as owner_name from duty d
           left join family_member m on m.id = d.owner_member_id
           where d.subject_id = $1 and d.status in ('open','late')
           order by d.due_at nulls last limit 8`,
          [subject.id],
        );
      const doses = await db.query(
          `select
             count(*) filter (where status = 'taken')::int as taken,
             count(*) filter (where status = 'missed')::int as missed
           from dose_log where subject_id = $1 and at >= date_trunc('day', now())`,
          [subject.id],
        );

      const openDoseCount = await db.query(
        `select count(*)::int as open from attention_event
         where subject_id = $1 and status = 'open' and kind = 'missed_dose'`,
        [subject.id],
      );

      // Health notes honour the per-metric dial: briefs are family-visible,
      // so metrics dialled to 'status' contribute nothing here.
      const healthNotes = await db.query(
        `select summary from health_observation
         where subject_id = $1 and created_at > now() - interval '24 hours'
           and health_share_level(subject_id, metric) <> 'status'
         order by created_at desc limit 2`,
        [subject.id],
      );

      const input: BriefInput = {
        subject: {
          id: subject.id,
          displayName: subject.display_name,
          kind: subject.kind ?? "elder",
          timezone: subject.timezone,
        },
        now: new Date(),
        todaysSignals: signals.rows.map((s) => ({
          id: s.id,
          subjectId: s.subject_id,
          memberId: s.member_id,
          signalType: s.signal_type,
          source: s.source,
          value: s.value,
          unit: s.unit,
          privacyLevel: s.privacy_level,
          occurredAt: new Date(s.occurred_at).toISOString(),
        })),
        attention: attention.rows.map((a) => ({
          subjectId: a.subject_id,
          kind: a.kind,
          severity: a.severity,
          title: a.title,
          detail: a.detail ?? undefined,
          ownerMemberId: a.owner_member_id,
          dedupeKey: a.dedupe_key ?? a.id,
        })),
        upcomingAppointments: appts.rows.map((a) => ({
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
        openDuties: duties.rows.map((d) => ({
          id: d.id,
          subjectId: d.subject_id,
          title: d.title,
          ownerMemberId: d.owner_member_id,
          ownerName: d.owner_name,
          dueAt: d.due_at ? new Date(d.due_at).toISOString() : null,
          status: d.status,
          priority: d.priority,
        })),
        dosesTaken: doses.rows[0]?.taken ?? 0,
        dosesOpen: openDoseCount.rows[0]?.open ?? 0,
        healthNotes: healthNotes.rows.map((r) => r.summary as string),
      };

      const facts = composeBriefFacts(input);
      const body = await writeBrief(facts);
      const actions = composeBriefActions(input);

      await db.query(
        `insert into daily_brief (subject_id, kind, body, actions, for_date)
         values ($1, $2, $3, $4, current_date)`,
        [subject.id, kind, body, JSON.stringify(actions)],
      );
      written++;

      await db.query(
        `insert into activation_event (workspace_id, step)
         values ($1, 'first_brief') on conflict do nothing`,
        [subject.workspace_id],
      );

      // The brief lands as a quiet notification for every member. On calm
      // evenings it becomes the single line the product exists for —
      // "nothing needs you tonight" — instead of a summary to parse.
      const calm = kind === "evening" ? composeCalmDigest(facts) : null;
      const members = await db.query(
        `select id from family_member where workspace_id = $1`,
        [subject.workspace_id],
      );
      for (const m of members.rows) {
        await notifyMember({
          memberId: m.id,
          title: calm
            ? `All quiet — ${subject.display_name}`
            : `${kind === "morning" ? "Morning" : "Evening"} Brief — ${subject.display_name}`,
          body: calm ?? body.slice(0, 140),
          link: `/app/orbits/${subject.id}`,
          priority: "low",
        });
      }
    }
    return written;
  });
}

/** Every 15 minutes: re-evaluate attention rules for all subjects. */
export async function attentionSweep(): Promise<number> {
  const subjects = await withService(async (db) => {
    const res = await db.query(`select id from care_subject`);
    return res.rows.map((r) => r.id as string);
  });
  for (const id of subjects) {
    await runDecideStage(id);
  }
  await markLateDuties();
  // The daily "how are you?" text rides the same sweep; it stamps a
  // per-subject date, so re-runs are no-ops.
  await sendSmsCheckinPrompts().catch(() => {});
  return subjects.length;
}

async function markLateDuties(): Promise<void> {
  await withService((db) =>
    db.query(
      `update duty set status = 'late'
       where status = 'open' and due_at is not null and due_at < now()`,
    ),
  );
}

/** Every 15 minutes: walk the escalation ladder for overdue attention. */
export async function escalationSweep(): Promise<number> {
  return withService(async (db) => {
    const due = await db.query(
      `select a.*, s.workspace_id, s.timezone, s.display_name as subject_name
       from attention_event a join care_subject s on s.id = a.subject_id
       where a.status = 'open' and a.escalate_at is not null and a.escalate_at < now()`,
    );

    // Per-workspace quiet hours + ladder, cached across this sweep.
    const rules = new Map<string, { start: string; end: string } | null>();
    async function quietFor(workspaceId: string): Promise<{ start: string; end: string } | null> {
      if (rules.has(workspaceId)) return rules.get(workspaceId)!;
      const r = await db.query(
        `select quiet_hours from escalation_rule where workspace_id = $1 and kind = 'default'`,
        [workspaceId],
      );
      const row = r.rows[0];
      let value: { start: string; end: string } | null;
      if (!row) {
        // No rule configured yet — the calm default: quiet 21:00–07:00.
        value = { start: "21:00", end: "07:00" };
      } else {
        const q = row.quiet_hours as { start?: string; end?: string; enabled?: boolean } | null;
        value = q && q.enabled !== false && q.start && q.end ? { start: q.start, end: q.end } : null;
      }
      rules.set(workspaceId, value);
      return value;
    }

    for (const event of due.rows) {
      const quiet = await quietFor(event.workspace_id);
      const decision = decideEscalation({
        severity: event.severity,
        createdAt: new Date(event.created_at),
        now: new Date(),
        quietHours: quiet ? { start: quiet.start, end: quiet.end, timezone: event.timezone } : null,
      });

      if (decision.notifyNow) {
        const targets =
          decision.target === "owner" && event.owner_member_id
            ? [{ id: event.owner_member_id }]
            : (
                await db.query(
                  decision.target === "emergency_contacts"
                    ? `select id from family_member where workspace_id = $1 and role in ('admin','emergency')`
                    : `select id from family_member where workspace_id = $1 and role = 'admin'`,
                  [event.workspace_id],
                )
              ).rows;
        for (const t of targets) {
          await notifyMember({
            memberId: t.id,
            title: `Still open: ${event.title}`,
            body: `${event.subject_name} · ${decision.reason}`,
            link: "/app/attention",
            priority: event.severity === "urgent" ? "urgent" : "high",
          });
        }
      }

      // Advance the timer so the ladder climbs instead of spamming.
      await db.query(
        `update attention_event set escalate_at = now() + interval '6 hours' where id = $1`,
        [event.id],
      );
    }
    return due.rows.length;
  });
}

/** Weekly: plain-language trend cards against personal baselines. */
export async function generatePatterns(): Promise<number> {
  return withService(async (db) => {
    const subjects = await db.query(`select id, display_name from care_subject`);
    let written = 0;

    for (const subject of subjects.rows) {
      const metrics = await db.query(
        `select value->>'metric' as metric, (value->>'value')::numeric as v
         from life_signal
         where subject_id = $1 and signal_type = 'metric'
           and value->>'metric' is not null and value->>'value' is not null
           and occurred_at > now() - interval '60 days'
         order by occurred_at asc
         limit 500`,
        [subject.id],
      );
      const byMetric = new Map<string, number[]>();
      for (const row of metrics.rows) {
        const list = byMetric.get(row.metric) ?? [];
        list.push(Number(row.v));
        byMetric.set(row.metric, list);
      }

      for (const [metric, values] of byMetric) {
        const pattern = detectPattern(metric, values, subject.display_name);
        if (!pattern) continue; // too little history — stay quiet
        // One current card per metric/window; replace, never pile up.
        await db.query(
          `delete from pattern where subject_id = $1 and metric = $2 and "window" = $3`,
          [subject.id, pattern.metric, pattern.window],
        );
        await db.query(
          `insert into pattern (subject_id, metric, direction, summary, "window")
           values ($1, $2, $3, $4, $5)`,
          [subject.id, pattern.metric, pattern.direction, pattern.summary, pattern.window],
        );
        written++;
      }
    }
    return written;
  });
}

/** Every 15 minutes: turn parked device notifications into readings, and
 * let expired raw readings fall off their retention clock. */
export async function healthSync(): Promise<number> {
  const { processParkedNotifications } = await import("./integrations/withings");
  const processed = await processParkedNotifications();
  await withService(async (db) => {
    await db.query(`delete from health_reading where expires_at < now()`);
    await db.query(`select rate_limit_sweep()`);
  }).catch(() => {});
  return processed;
}
