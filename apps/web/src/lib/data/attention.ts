import { withUser } from "@kinos/db";
import type { AttentionEventRow } from "@kinos/db";

export interface AttentionListItem extends AttentionEventRow {
  subject_name: string;
  owner_name: string | null;
}

export async function listOpenAttention(userId: string): Promise<AttentionListItem[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select a.*, s.display_name as subject_name, m.display_name as owner_name
       from attention_event a
       join care_subject s on s.id = a.subject_id
       left join family_member m on m.id = a.owner_member_id
       where a.status in ('open','ack')
       order by case a.severity when 'urgent' then 0 when 'attention' then 1 else 2 end,
                a.created_at desc`,
    );
    return res.rows;
  });
}

export async function countOpenAttention(userId: string): Promise<number> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select count(*)::int as n from attention_event where status = 'open'`,
    );
    return res.rows[0]?.n ?? 0;
  });
}
