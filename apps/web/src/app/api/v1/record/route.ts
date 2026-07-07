import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";

export const dynamic = "force-dynamic";

/** The Family Record in the hand: read the memory, add to it. */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const q = new URL(req.url).searchParams.get("q")?.trim() || null;
    const rows = await withUser(userId, async (db) => {
      const res = await db.query(
        `select i.id, i.kind, i.title, i.body, i.at, i.subject_id,
                s.display_name as subject_name, m.display_name as author_name
         from family_record_item i
         join care_subject s on s.id = i.subject_id
         left join family_member m on m.id = i.author_member_id
         ${q ? "where i.title ilike '%' || $1 || '%' or i.body ilike '%' || $1 || '%'" : ""}
         order by i.at desc limit 50`,
        q ? [q] : [],
      );
      return res.rows;
    });
    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        at: r.at,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        authorName: r.author_name,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({
  subjectId: z.string().uuid(),
  kind: z.enum(["note", "decision", "incident", "question"]).default("note"),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "a record entry needs a title" }, { status: 400 });
    }
    const { subjectId, kind, title, body } = parsed.data;
    const id = await withUser(userId, async (db) => {
      const res = await db.query(
        `insert into family_record_item (subject_id, kind, title, body, author_member_id)
         values ($1, $2, $3, $4, $5) returning id`,
        [subjectId, kind, title, body ?? null, ctx.member.id],
      );
      return res.rows[0]!.id as string;
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError(err);
  }
}
