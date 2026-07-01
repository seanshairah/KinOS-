import { withUser } from "@kinos/db";
import type {
  AppointmentRow,
  AttentionEventRow,
  CareSubjectRow,
  DailyBriefRow,
  DoseLogRow,
  DutyRow,
  LifeSignalRow,
  MedicationRow,
  MemberRow,
  PatternRow,
} from "@kinos/db";

/** Orbit View: one card per loved one with live status. */
export interface OrbitSummary {
  subject: CareSubjectRow;
  status: "steady" | "attention" | "urgent";
  lastCheckin: string | null;
  lastCheckinMood: string | null;
  openAttention: number;
  worstSeverity: string | null;
  nextAppointment: { title: string; starts_at: string; transport_confirmed: boolean } | null;
  openDuties: number;
  dosesToday: { taken: number };
}

export async function listOrbits(userId: string): Promise<OrbitSummary[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select s.*,
        (select count(*)::int from attention_event a
          where a.subject_id = s.id and a.status = 'open') as open_attention,
        (select max(a.severity) from attention_event a
          where a.subject_id = s.id and a.status = 'open'
            and a.severity = 'urgent') as urgent_flag,
        (select l.occurred_at from life_signal l
          where l.subject_id = s.id and l.signal_type = 'checkin'
          order by l.occurred_at desc limit 1) as last_checkin,
        (select l.value->>'mood' from life_signal l
          where l.subject_id = s.id and l.signal_type = 'checkin'
          order by l.occurred_at desc limit 1) as last_mood,
        (select count(*)::int from duty d
          where d.subject_id = s.id and d.status = 'open') as open_duties,
        (select count(*)::int from dose_log dl
          where dl.subject_id = s.id and dl.status = 'taken'
            and dl.at >= date_trunc('day', now())) as doses_taken
       from care_subject s
       order by open_attention desc, s.created_at asc`,
    );

    const orbits: OrbitSummary[] = [];
    for (const row of res.rows) {
      const appt = await db.query(
        `select title, starts_at, transport_confirmed from appointment
         where subject_id = $1 and starts_at > now()
         order by starts_at asc limit 1`,
        [row.id],
      );
      orbits.push({
        subject: row as CareSubjectRow,
        status:
          row.urgent_flag != null
            ? "urgent"
            : row.open_attention > 0
              ? "attention"
              : "steady",
        lastCheckin: row.last_checkin,
        lastCheckinMood: row.last_mood,
        openAttention: row.open_attention,
        worstSeverity: row.urgent_flag,
        nextAppointment: appt.rows[0] ?? null,
        openDuties: row.open_duties,
        dosesToday: { taken: row.doses_taken },
      });
    }
    return orbits;
  });
}

/** Person Orbit: the full picture, filtered by role + consent in the DB. */
export interface OrbitDetail {
  subject: CareSubjectRow;
  signals: (LifeSignalRow & { interpretation_label: string | null; confidence: number | null })[];
  attention: AttentionEventRow[];
  duties: (DutyRow & { owner_name: string | null })[];
  medications: MedicationRow[];
  dosesToday: DoseLogRow[];
  appointments: (AppointmentRow & { transport_owner_name: string | null })[];
  brief: DailyBriefRow | null;
  patterns: PatternRow[];
  members: MemberRow[];
}

export async function getOrbitDetail(
  userId: string,
  subjectId: string,
): Promise<OrbitDetail | null> {
  return withUser(userId, async (db) => {
    const subject = await db.query(`select * from care_subject where id = $1`, [subjectId]);
    if (!subject.rows[0]) return null;

    // Sequential on purpose: one pg client handles one query at a time.
    const signals = await db.query(
          `select l.*,
             (select i.label from signal_interpretation i
               where i.signal_id = l.id order by i.confidence desc nulls last limit 1) as interpretation_label,
             (select i.confidence from signal_interpretation i
               where i.signal_id = l.id order by i.confidence desc nulls last limit 1) as confidence
           from life_signal l
           where l.subject_id = $1
           order by l.occurred_at desc
           limit 40`,
          [subjectId],
        );
    const attention = await db.query(
          `select * from attention_event
           where subject_id = $1 and status in ('open','ack')
           order by case severity when 'urgent' then 0 when 'attention' then 1 else 2 end, created_at desc`,
          [subjectId],
        );
    const duties = await db.query(
          `select d.*, m.display_name as owner_name
           from duty d left join family_member m on m.id = d.owner_member_id
           where d.subject_id = $1 and d.status in ('open','late')
           order by d.due_at asc nulls last`,
          [subjectId],
        );
    const medications = await db.query(
          `select * from medication where subject_id = $1 and active order by name`,
          [subjectId],
        );
    const dosesToday = await db.query(
          `select * from dose_log
           where subject_id = $1 and at >= date_trunc('day', now())
           order by at desc`,
          [subjectId],
        );
    const appointments = await db.query(
          `select a.*, m.display_name as transport_owner_name
           from appointment a left join family_member m on m.id = a.transport_owner_member_id
           where a.subject_id = $1 and a.starts_at > now() - interval '2 hours'
           order by a.starts_at asc limit 10`,
          [subjectId],
        );
    const brief = await db.query(
          `select * from daily_brief where subject_id = $1
           order by created_at desc limit 1`,
          [subjectId],
        );
    const patterns = await db.query(
          `select * from pattern where subject_id = $1 order by at desc limit 6`,
          [subjectId],
        );
    const members = await db.query(
          `select * from family_member where workspace_id = $1 order by created_at`,
          [subject.rows[0].workspace_id],
        );

    return {
      subject: subject.rows[0] as CareSubjectRow,
      signals: signals.rows,
      attention: attention.rows,
      duties: duties.rows,
      medications: medications.rows,
      dosesToday: dosesToday.rows,
      appointments: appointments.rows,
      brief: brief.rows[0] ?? null,
      patterns: patterns.rows,
      members: members.rows,
    };
  });
}
