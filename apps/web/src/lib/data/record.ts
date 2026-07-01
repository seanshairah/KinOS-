import { withUser } from "@kinos/db";
import type { CareSubjectRow, FamilyRecordItemRow } from "@kinos/db";

export interface RecordListItem extends FamilyRecordItemRow {
  subject_name: string;
  author_name: string | null;
}

export async function listRecordItems(
  userId: string,
  search?: string,
): Promise<RecordListItem[]> {
  return withUser(userId, async (db) => {
    const base = `
      select r.*, s.display_name as subject_name, m.display_name as author_name
      from family_record_item r
      join care_subject s on s.id = r.subject_id
      left join family_member m on m.id = r.author_member_id`;
    const res = search
      ? await db.query(
          `${base} where r.title ilike $1 or r.body ilike $1
           order by r.at desc limit 50`,
          [`%${search}%`],
        )
      : await db.query(`${base} order by r.at desc limit 50`);
    return res.rows;
  });
}

export async function listSubjects(userId: string): Promise<CareSubjectRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(`select * from care_subject order by created_at`);
    return res.rows;
  });
}
