import { withUser } from "@kinos/db";
import type {
  AccessLogRow,
  ConsentGrantRow,
  EmergencyContactRow,
  EmergencyProfileRow,
  InvitationRow,
  MemberRow,
} from "@kinos/db";

export interface ConsentListItem extends ConsentGrantRow {
  subject_name: string;
  grantee_name: string | null;
  grantee_role: string;
}

export async function listConsentGrants(userId: string): Promise<ConsentListItem[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select g.*, s.display_name as subject_name,
              m.display_name as grantee_name, m.role as grantee_role
       from consent_grant g
       join care_subject s on s.id = g.subject_id
       join family_member m on m.id = g.grantee_member_id
       order by g.granted_at desc`,
    );
    return res.rows;
  });
}

export async function listMembers(userId: string): Promise<MemberRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(`select * from family_member order by created_at`);
    return res.rows;
  });
}

export async function listInvitations(userId: string): Promise<InvitationRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select * from invitation where status = 'pending' order by created_at desc`,
    );
    return res.rows;
  });
}

export async function listAccessLog(userId: string): Promise<AccessLogRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select * from access_log order by at desc limit 100`,
    );
    return res.rows;
  });
}

export interface EmergencyView {
  profile: EmergencyProfileRow | null;
  contacts: EmergencyContactRow[];
}

export async function getEmergencyView(
  userId: string,
  subjectId: string,
): Promise<EmergencyView> {
  return withUser(userId, async (db) => {
    const profile = await db.query(
      `select * from emergency_profile where subject_id = $1`,
      [subjectId],
    );
    const contacts = await db.query(
      `select * from emergency_contact where subject_id = $1 order by priority`,
      [subjectId],
    );
    return { profile: profile.rows[0] ?? null, contacts: contacts.rows };
  });
}

/** Everything the family can see, as one JSON export (per workspace). */
export async function exportWorkspaceData(userId: string): Promise<Record<string, unknown>> {
  return withUser(userId, async (db) => {
    const tables = [
      "family_workspace",
      "family_member",
      "care_subject",
      "life_signal",
      "attention_event",
      "duty",
      "medication",
      "dose_log",
      "appointment",
      "caregiver_visit",
      "money_pot",
      "contribution",
      "expense",
      "family_record_item",
      "daily_brief",
      "consent_grant",
      "emergency_contact",
    ];
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    for (const table of tables) {
      const res = await db.query(`select * from ${table}`);
      out[table] = res.rows;
    }
    return out;
  });
}
