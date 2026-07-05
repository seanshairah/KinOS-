import { withUser } from "@kinos/db";
import type {
  CarePlanRow,
  FamilyHandoverRow,
  ProofOfCareReportRow,
  TrustLogRow,
} from "@kinos/db";
import {
  composeFamilyRhythm,
  composeHandover,
  composeTomorrowPrep,
  type HandoverFacts,
  type RhythmLine,
  type TomorrowPrep,
} from "@kinos/engine";

/**
 * The operating layer's reads: care plan, handover, trust log, tomorrow
 * prep, family rhythm, proof of care. All through RLS; the engine turns
 * rows into calm sentences.
 */

// ---------- care plan ----------

export async function getCarePlan(
  userId: string,
  subjectId: string,
): Promise<CarePlanRow | null> {
  return withUser(userId, async (db) => {
    const res = await db.query(`select * from care_plan where subject_id = $1`, [subjectId]);
    return res.rows[0] ?? null;
  });
}

// ---------- trust log ----------

export interface TrustLogView extends TrustLogRow {
  actor_name: string | null;
  subject_name: string | null;
}

export async function listTrustLog(userId: string, limit = 60): Promise<TrustLogView[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select t.*, m.display_name as actor_name, s.display_name as subject_name
       from trust_log t
       left join family_member m on m.id = t.actor_member_id
       left join care_subject s on s.id = t.subject_id
       order by t.at desc limit $1`,
      [limit],
    );
    return res.rows;
  });
}

/** Append to the trust log as the acting member — visible to the family. */
export async function logTrust(
  userId: string,
  entry: {
    workspaceId: string;
    actorMemberId: string;
    action: TrustLogRow["action"];
    subjectId?: string | null;
    detail?: string | null;
  },
): Promise<void> {
  await withUser(userId, async (db) => {
    await db.query(
      `insert into trust_log (workspace_id, actor_member_id, action, subject_id, detail)
       values ($1, $2, $3, $4, $5)`,
      [
        entry.workspaceId,
        entry.actorMemberId,
        entry.action,
        entry.subjectId ?? null,
        entry.detail ?? null,
      ],
    );
  });
}

// ---------- handover ----------

export interface HandoverView extends FamilyHandoverRow {
  subject_name: string;
  from_name: string | null;
  to_name: string | null;
}

export async function listHandovers(
  userId: string,
  subjectId?: string,
  limit = 10,
): Promise<HandoverView[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select h.*, s.display_name as subject_name,
              f.display_name as from_name, t.display_name as to_name
       from family_handover h
       join care_subject s on s.id = h.subject_id
       left join family_member f on f.id = h.from_member_id
       left join family_member t on t.id = h.to_member_id
       ${subjectId ? "where h.subject_id = $2" : ""}
       order by h.created_at desc limit $1`,
      subjectId ? [limit, subjectId] : [limit],
    );
    return res.rows;
  });
}

/** Gather today for one subject and write the handover in the family voice. */
export async function buildHandoverBody(
  userId: string,
  subjectId: string,
  fromName: string,
  toName?: string | null,
): Promise<string> {
  return withUser(userId, async (db) => {
    const subject = await db.query(
      `select display_name, timezone from care_subject where id = $1`,
      [subjectId],
    );
    const tz = subject.rows[0]?.timezone ?? "Africa/Harare";
    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });

    const signals = await db.query(
      `select signal_type, value, occurred_at from life_signal
       where subject_id = $1 and occurred_at >= date_trunc('day', now())
       order by occurred_at asc limit 20`,
      [subjectId],
    );
    const today: string[] = [];
    for (const s of signals.rows) {
      const v = (s.value ?? {}) as Record<string, unknown>;
      const at = timeFmt.format(new Date(s.occurred_at));
      if (s.signal_type === "checkin") today.push(`Checked in at ${at}, feeling ${v.mood ?? "okay"}`);
      else if (s.signal_type === "voice_note") today.push(`A note was left at ${at}`);
      else if (s.signal_type === "caregiver_visit") today.push(`Caregiver visit at ${at}`);
      else if (s.signal_type === "wellness_check") today.push(`Shared a wellness check at ${at}`);
    }

    const duties = await db.query(
      `select d.title, m.display_name as owner_name from duty d
       left join family_member m on m.id = d.owner_member_id
       where d.subject_id = $1 and d.status in ('open','late')
       order by d.due_at asc nulls last limit 6`,
      [subjectId],
    );

    const meds = await db.query(
      `select
         (select count(*)::int from dose_log dl
           where dl.subject_id = $1 and dl.status = 'taken'
             and dl.at >= date_trunc('day', now())) as taken,
         (select coalesce(sum(jsonb_array_length(m.schedule->'times')), 0)::int
           from medication m where m.subject_id = $1 and m.active) as scheduled`,
      [subjectId],
    );
    const taken = meds.rows[0]?.taken ?? 0;
    const scheduled = meds.rows[0]?.scheduled ?? 0;

    const expenses = await db.query(
      `select e.amount, e.currency, e.category from expense e
       join money_pot p on p.id = e.pot_id
       where p.subject_id = $1 and e.at >= date_trunc('day', now())
       order by e.at asc limit 6`,
      [subjectId],
    );

    const upcoming = await db.query(
      `select title, starts_at from appointment
       where subject_id = $1 and starts_at between now() and now() + interval '48 hours'
       order by starts_at asc limit 4`,
      [subjectId],
    );
    const dayFmt = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });

    const attention = await db.query(
      `select title from attention_event
       where subject_id = $1 and status in ('open','ack')
       order by created_at desc limit 4`,
      [subjectId],
    );

    const facts: HandoverFacts = {
      subjectName: subject.rows[0]?.display_name ?? "them",
      fromName,
      toName,
      today,
      openDuties: duties.rows.map((d) => ({ title: d.title, ownerName: d.owner_name })),
      medication: { dosesTaken: taken, dosesOpen: Math.max(0, scheduled - taken) },
      expensesToday: expenses.rows.map((e) => ({
        note: `${e.currency} ${Number(e.amount).toFixed(2)} ${e.category}`,
      })),
      upcoming: upcoming.rows.map((u) => ({
        title: u.title,
        when: dayFmt.format(new Date(u.starts_at)),
      })),
      worthWatching: attention.rows.map((a) => a.title),
    };
    return composeHandover(facts);
  });
}

// ---------- tomorrow prep ----------

export interface SubjectPrep {
  subjectId: string;
  subjectName: string;
  prep: TomorrowPrep;
}

export async function getTomorrowPrep(userId: string): Promise<SubjectPrep[]> {
  return withUser(userId, async (db) => {
    const subjects = await db.query(
      `select id, display_name, timezone, expected_visit_every_hours from care_subject
       order by created_at`,
    );
    const out: SubjectPrep[] = [];
    for (const s of subjects.rows) {
      const tz = s.timezone ?? "Africa/Harare";
      const whenFmt = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      });
      // "Tomorrow" in the subject's own day, computed from their local date.
      const appts = await db.query(
        `select a.title, a.starts_at, a.location, a.transport_confirmed,
                m.display_name as transport_owner_name
         from appointment a
         left join family_member m on m.id = a.transport_owner_member_id
         where a.subject_id = $1
           and (a.starts_at at time zone $2)::date =
               ((now() at time zone $2)::date + 1)
         order by a.starts_at`,
        [s.id, tz],
      );
      const refills = await db.query(
        `select name from medication
         where subject_id = $1 and active
           and refill_at is not null
           and refill_at <= ((now() at time zone $2)::date + 1)`,
        [s.id, tz],
      );
      const duties = await db.query(
        `select d.title, m.display_name as owner_name from duty d
         left join family_member m on m.id = d.owner_member_id
         where d.subject_id = $1 and d.status in ('open','late')
           and d.due_at is not null
           and (d.due_at at time zone $2)::date = ((now() at time zone $2)::date + 1)`,
        [s.id, tz],
      );
      const visitPlanned = await db.query(
        `select 1 from caregiver_visit
         where subject_id = $1
           and check_in is not null
           and (check_in at time zone $2)::date = ((now() at time zone $2)::date + 1)
         limit 1`,
        [s.id, tz],
      );
      const docs = await db.query(
        `select i.title from family_record_item i
         where i.subject_id = $1 and i.kind = 'document'
           and i.at >= now() - interval '30 days'
         order by i.at desc limit 2`,
        [s.id],
      );

      const prep = composeTomorrowPrep({
        subjectName: s.display_name,
        appointments: appts.rows.map((a) => ({
          title: a.title,
          when: whenFmt.format(new Date(a.starts_at)),
          transportConfirmed: a.transport_confirmed,
          transportOwnerName: a.transport_owner_name,
          location: a.location,
        })),
        refillsDue: refills.rows.map((r) => ({ medicationName: r.name })),
        dutiesDue: duties.rows.map((d) => ({ title: d.title, ownerName: d.owner_name })),
        caregiverVisitExpected: s.expected_visit_every_hours != null,
        caregiverVisitPlanned: visitPlanned.rows.length > 0,
        // Only suggest carrying documents when tomorrow holds a clinic visit.
        documentsToCarry:
          appts.rows.some((a) => a.title) && docs.rows.length > 0
            ? docs.rows.map((d) => d.title)
            : [],
      });
      out.push({ subjectId: s.id, subjectName: s.display_name, prep });
    }
    return out;
  });
}

// ---------- family rhythm ----------

export interface SubjectRhythm {
  subjectId: string;
  subjectName: string;
  lines: RhythmLine[];
}

export async function getFamilyRhythm(userId: string): Promise<SubjectRhythm[]> {
  return withUser(userId, async (db) => {
    const subjects = await db.query(
      `select id, display_name, timezone from care_subject order by created_at`,
    );
    const out: SubjectRhythm[] = [];
    for (const s of subjects.rows) {
      const tz = s.timezone ?? "Africa/Harare";
      const checkins = await db.query(
        `select extract(hour from occurred_at at time zone $2)::int as hour
         from life_signal
         where subject_id = $1 and signal_type = 'checkin'
           and occurred_at >= now() - interval '28 days'
         order by occurred_at asc`,
        [s.id, tz],
      );
      const doses = await db.query(
        `select
           (select count(*)::int from dose_log
             where subject_id = $1 and status = 'taken'
               and at >= now() - interval '14 days') as taken,
           (select coalesce(sum(jsonb_array_length(m.schedule->'times')), 0)::int * 14
             from medication m where m.subject_id = $1 and m.active) as scheduled`,
        [s.id],
      );
      const visits = await db.query(
        `select to_char(check_in at time zone $2, 'Dy') as day
         from caregiver_visit
         where subject_id = $1 and check_in is not null
           and check_in >= now() - interval '28 days'`,
        [s.id, tz],
      );
      const spend = await db.query(
        `select date_trunc('week', e.at)::date as wk, count(*)::int as n
         from expense e join money_pot p on p.id = e.pot_id
         where p.subject_id = $1 and e.at >= now() - interval '28 days'
         group by 1 order by 1`,
        [s.id],
      );

      const lines = composeFamilyRhythm({
        subjectName: s.display_name,
        timezone: tz,
        checkinHours: checkins.rows.map((r) => r.hour),
        dosesTaken: doses.rows[0]?.taken ?? 0,
        dosesScheduled: doses.rows[0]?.scheduled ?? 0,
        visitWeekdays: visits.rows.map((r) => String(r.day).trim()),
        weeklySpendCounts: spend.rows.map((r) => r.n),
      });
      if (lines.length > 0) out.push({ subjectId: s.id, subjectName: s.display_name, lines });
    }
    return out;
  });
}

// ---------- proof of care ----------

export async function listProofReports(
  userId: string,
  limit = 8,
): Promise<ProofOfCareReportRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select * from proof_of_care_report order by week_start desc limit $1`,
      [limit],
    );
    return res.rows;
  });
}
