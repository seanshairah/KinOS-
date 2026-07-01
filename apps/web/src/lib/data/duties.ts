import { withUser } from "@kinos/db";
import type { DutyRow } from "@kinos/db";

export interface DutyListItem extends DutyRow {
  subject_name: string;
  owner_name: string | null;
}

export async function listDuties(
  userId: string,
  scope: "open" | "done" = "open",
): Promise<DutyListItem[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      scope === "open"
        ? `select d.*, s.display_name as subject_name, m.display_name as owner_name
           from duty d
           join care_subject s on s.id = d.subject_id
           left join family_member m on m.id = d.owner_member_id
           where d.status in ('open','late')
           order by d.due_at asc nulls last`
        : `select d.*, s.display_name as subject_name, m.display_name as owner_name
           from duty d
           join care_subject s on s.id = d.subject_id
           left join family_member m on m.id = d.owner_member_id
           where d.status = 'done'
           order by d.completed_at desc nulls last
           limit 30`,
    );
    return res.rows;
  });
}
