import { withUser } from "@kinos/db";
import { describeSignal } from "./signals";

/**
 * The orbit timeline — one person's story, day by day. Everything is
 * fetched under the caller's RLS context, so each viewer's timeline is
 * exactly the story they're consented to see: health observations,
 * private notes, and money never leak past the database.
 */

export type TimelineTone = "calm" | "ember" | "halo" | "paper";

export interface TimelineEntry {
  at: string; // ISO
  kind: string; // mono label, e.g. "check-in", "attention", "brief"
  text: string;
  detail?: string;
  tone: TimelineTone;
}

export interface TimelineDay {
  /** Stable per-day key in the subject's timezone, e.g. "2026-06-21". */
  key: string;
  label: string; // "Tuesday · 21 June"
  entries: TimelineEntry[];
}

export interface OrbitTimeline {
  subject: { id: string; display_name: string; timezone: string };
  days: TimelineDay[];
  total: number;
}

const KIND_LABEL: Record<string, string> = {
  checkin: "check-in",
  voice_note: "voice note",
  medication_dose: "medication",
  duty_update: "duty",
  receipt: "receipt",
  metric: "rhythm",
  health_update: "health",
};

export async function getOrbitTimeline(
  userId: string,
  subjectId: string,
  days = 30,
): Promise<OrbitTimeline | null> {
  return withUser(userId, async (db) => {
    const subjectRes = await db.query(
      `select id, display_name, timezone from care_subject where id = $1`,
      [subjectId],
    );
    const subject = subjectRes.rows[0];
    if (!subject) return null;

    const since = `now() - interval '${Math.max(1, Math.min(days, 90))} days'`;

    const [signals, observations, attention, dutiesDone, appts, briefs, records] =
      await (async () => {
        // Sequential on purpose: one pg client, one query at a time.
        const a = await db.query(
          `select l.signal_type, l.value, l.occurred_at, m.display_name as member_name
           from life_signal l left join family_member m on m.id = l.member_id
           where l.subject_id = $1 and l.occurred_at > ${since}
           order by l.occurred_at desc limit 200`,
          [subjectId],
        );
        const b = await db.query(
          `select summary, detail, created_at from health_observation
           where subject_id = $1 and created_at > ${since}
           order by created_at desc limit 60`,
          [subjectId],
        );
        const c = await db.query(
          `select title, severity, status, created_at, resolved_at from attention_event
           where subject_id = $1 and created_at > ${since}
           order by created_at desc limit 60`,
          [subjectId],
        );
        const d = await db.query(
          `select d.title, d.completed_at, m.display_name as owner_name
           from duty d left join family_member m on m.id = d.owner_member_id
           where d.subject_id = $1 and d.status = 'done' and d.completed_at > ${since}
           order by d.completed_at desc limit 60`,
          [subjectId],
        );
        const e = await db.query(
          `select title, kind, location, starts_at from appointment
           where subject_id = $1 and starts_at > ${since} and starts_at < now()
           order by starts_at desc limit 40`,
          [subjectId],
        );
        const f = await db.query(
          `select kind, body, created_at from daily_brief
           where subject_id = $1 and created_at > ${since} and kind in ('morning','evening')
           order by created_at desc limit 40`,
          [subjectId],
        );
        const g = await db.query(
          `select r.kind, r.title, r.at, m.display_name as author_name
           from family_record_item r left join family_member m on m.id = r.author_member_id
           where r.subject_id = $1 and r.at > ${since}
           order by r.at desc limit 60`,
          [subjectId],
        );
        return [a, b, c, d, e, f, g];
      })();

    const entries: TimelineEntry[] = [];

    for (const s of signals.rows) {
      const described = describeSignal({
        id: "",
        subject_name: subject.display_name,
        member_name: s.member_name,
        signal_type: s.signal_type,
        source: null,
        value: s.value,
        privacy_level: "family",
        occurred_at: s.occurred_at,
      });
      entries.push({
        at: new Date(s.occurred_at).toISOString(),
        kind: KIND_LABEL[s.signal_type] ?? s.signal_type.replaceAll("_", " "),
        text: described.text,
        tone: described.tone,
      });
    }
    for (const o of observations.rows) {
      entries.push({
        at: new Date(o.created_at).toISOString(),
        kind: "health",
        text: o.summary,
        detail: o.detail ?? undefined,
        tone: "halo",
      });
    }
    for (const a of attention.rows) {
      entries.push({
        at: new Date(a.created_at).toISOString(),
        kind: "attention",
        text: a.title,
        tone: "ember",
      });
      if (a.resolved_at) {
        entries.push({
          at: new Date(a.resolved_at).toISOString(),
          kind: "settled",
          text: `Settled — ${lowerFirst(a.title)}`,
          tone: "calm",
        });
      }
    }
    for (const d of dutiesDone.rows) {
      entries.push({
        at: new Date(d.completed_at).toISOString(),
        kind: "duty done",
        text: `"${d.title}" was done${d.owner_name ? ` by ${d.owner_name}` : ""}`,
        tone: "calm",
      });
    }
    for (const a of appts.rows) {
      entries.push({
        at: new Date(a.starts_at).toISOString(),
        kind: a.kind === "clinic" ? "clinic" : "appointment",
        text: `${a.title}${a.location ? ` · ${a.location}` : ""}`,
        tone: "halo",
      });
    }
    for (const b of briefs.rows) {
      entries.push({
        at: new Date(b.created_at).toISOString(),
        kind: `${b.kind} brief`,
        text: b.body,
        tone: "paper",
      });
    }
    for (const r of records.rows) {
      entries.push({
        at: new Date(r.at).toISOString(),
        kind: r.kind === "note" ? "record" : r.kind,
        text: r.title,
        detail: r.author_name ? `kept by ${r.author_name}` : undefined,
        tone: "halo",
      });
    }

    entries.sort((a, b) => b.at.localeCompare(a.at));

    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: subject.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const weekdayFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: subject.timezone,
      weekday: "long",
    });
    const dayMonthFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: subject.timezone,
      day: "numeric",
      month: "long",
    });

    const byDay = new Map<string, TimelineDay>();
    for (const entry of entries) {
      const date = new Date(entry.at);
      const key = dayKey.format(date);
      let day = byDay.get(key);
      if (!day) {
        day = {
          key,
          label: `${weekdayFmt.format(date)} · ${dayMonthFmt.format(date)}`,
          entries: [],
        };
        byDay.set(key, day);
      }
      day.entries.push(entry);
    }

    return {
      subject: {
        id: subject.id,
        display_name: subject.display_name,
        timezone: subject.timezone,
      },
      days: [...byDay.values()],
      total: entries.length,
    };
  });
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
