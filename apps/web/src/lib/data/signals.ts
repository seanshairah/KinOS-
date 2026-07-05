import { withUser } from "@kinos/db";

/** Family-wide Life Signals — what changed, newest first, RLS-scoped. */
export interface SignalSummary {
  id: string;
  subject_name: string;
  member_name: string | null;
  signal_type: string;
  source: string | null;
  value: Record<string, unknown> | null;
  privacy_level: string;
  occurred_at: string;
}

export async function listRecentSignals(
  userId: string,
  limit = 40,
): Promise<SignalSummary[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select l.id, l.signal_type, l.source, l.value, l.privacy_level, l.occurred_at,
              s.display_name as subject_name,
              m.display_name as member_name
       from life_signal l
       join care_subject s on s.id = l.subject_id
       left join family_member m on m.id = l.member_id
       order by l.occurred_at desc
       limit $1`,
      [limit],
    );
    return res.rows as SignalSummary[];
  });
}

/** Gentle trends against each person's own baseline — never alarms. */
export interface PatternSummary {
  id: string;
  subject_name: string;
  summary: string;
  at: string;
}

export async function listPatterns(userId: string, limit = 4): Promise<PatternSummary[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select p.id, p.summary, p.at, s.display_name as subject_name
       from pattern p join care_subject s on s.id = p.subject_id
       order by p.at desc limit $1`,
      [limit],
    );
    return res.rows as PatternSummary[];
  });
}

/** Speak the signal in family words, never in log words. */
export function describeSignal(s: SignalSummary): { text: string; tone: "ember" | "calm" | "halo" } {
  const v = s.value ?? {};
  switch (s.signal_type) {
    case "checkin": {
      const mood = typeof v.mood === "string" ? ` · feeling ${v.mood}` : "";
      return { text: `${s.subject_name} checked in${mood}`, tone: "calm" };
    }
    case "medication_dose": {
      const status = typeof v.status === "string" ? v.status : "logged";
      return {
        text: `${s.subject_name} — medication ${status}`,
        tone: status === "taken" ? "calm" : "ember",
      };
    }
    case "receipt": {
      const merchant = typeof v.merchant === "string" ? v.merchant : "receipt";
      const amount =
        typeof v.amount === "number" && typeof v.currency === "string"
          ? ` · ${v.currency} ${v.amount.toFixed(2)}`
          : "";
      return { text: `Receipt filed — ${merchant}${amount}`, tone: "halo" };
    }
    case "voice_note":
      return { text: `Voice note${s.member_name ? ` from ${s.member_name}` : ""}`, tone: "halo" };
    case "duty_update":
      return { text: typeof v.title === "string" ? `Duty — ${v.title}` : "A duty moved forward", tone: "calm" };
    case "metric": {
      const metric = typeof v.metric === "string" ? v.metric.replaceAll("_", " ") : "a rhythm";
      return { text: `${s.subject_name} — ${metric} noted`, tone: "halo" };
    }
    case "note":
      return { text: typeof v.note === "string" ? v.note : `A note about ${s.subject_name}`, tone: "halo" };
    case "wellness_check": {
      const worth = v.worth_a_check === true;
      return {
        text:
          typeof v.summary === "string"
            ? v.summary
            : `${s.subject_name} shared a wellness check`,
        tone: worth ? "ember" : "calm",
      };
    }
    default:
      return { text: `${s.subject_name} — ${s.signal_type.replaceAll("_", " ")}`, tone: "halo" };
  }
}
