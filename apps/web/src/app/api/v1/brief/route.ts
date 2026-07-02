import { NextResponse } from "next/server";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** The latest Daily Brief for each person the caller may see. */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const briefs = await withUser(userId, async (db) => {
      const res = await db.query(
        `select distinct on (b.subject_id)
                b.id, b.subject_id, b.kind, b.body, b.for_date, b.created_at,
                s.display_name as subject_name
         from daily_brief b
         join care_subject s on s.id = b.subject_id
         order by b.subject_id, b.created_at desc`,
      );
      return res.rows;
    });
    return NextResponse.json({
      briefs: briefs.map((b) => ({
        id: b.id,
        subjectId: b.subject_id,
        subjectName: b.subject_name,
        kind: b.kind,
        body: b.body,
        forDate: b.for_date,
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
