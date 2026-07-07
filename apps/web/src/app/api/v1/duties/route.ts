import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { notifyMember } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** The family's open hands: every duty, and a way to take one on. */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const rows = await withUser(userId, async (db) => {
      const res = await db.query(
        `select d.id, d.title, d.due_at, d.priority, d.status, d.subject_id,
                s.display_name as subject_name, m.display_name as owner_name, d.owner_member_id
         from duty d
         join care_subject s on s.id = d.subject_id
         left join family_member m on m.id = d.owner_member_id
         where d.status in ('open','late')
         order by d.due_at asc nulls last, d.created_at desc
         limit 60`,
      );
      return res.rows;
    });
    return NextResponse.json({
      duties: rows.map((d) => ({
        id: d.id,
        title: d.title,
        dueAt: d.due_at,
        priority: d.priority,
        status: d.status,
        subjectId: d.subject_id,
        subjectName: d.subject_name,
        ownerName: d.owner_name,
        ownerMemberId: d.owner_member_id,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  dueAt: z.string().datetime().optional(),
  ownerMemberId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "a duty needs at least a name" }, { status: 400 });
    }
    const { subjectId, title, dueAt, ownerMemberId } = parsed.data;
    const id = await withUser(userId, async (db) => {
      const res = await db.query(
        `insert into duty (subject_id, title, owner_member_id, due_at, created_by)
         values ($1, $2, $3, $4, $5) returning id`,
        [subjectId, title, ownerMemberId ?? null, dueAt ?? null, ctx.member.id],
      );
      return res.rows[0]!.id as string;
    });
    if (ownerMemberId && ownerMemberId !== ctx.member.id) {
      await notifyMember({ memberId: ownerMemberId, title: `New duty: ${title}`, link: "/app/duties" });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err);
  }
}
