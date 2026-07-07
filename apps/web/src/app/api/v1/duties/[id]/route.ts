import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { captureSignal } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["done", "mine"]),
});

/** Close a duty, or take it into your own hands. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const { id } = await params;
    const dutyId = z.string().uuid().safeParse(id);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!dutyId.success || !parsed.success) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const duty = await withUser(userId, async (db) => {
      if (parsed.data.action === "mine") {
        const res = await db.query(
          `update duty set owner_member_id = $2 where id = $1 and status in ('open','late')
           returning subject_id, title`,
          [dutyId.data, ctx.member.id],
        );
        return res.rows[0] ?? null;
      }
      const res = await db.query(
        `update duty set status = 'done', completed_at = now()
         where id = $1 and status in ('open','late')
         returning subject_id, title`,
        [dutyId.data],
      );
      return res.rows[0] ?? null;
    });
    if (!duty) return NextResponse.json({ error: "already settled" }, { status: 409 });

    if (parsed.data.action === "done") {
      // A completed duty is remembered like every other act of care.
      await captureSignal(userId, {
        subjectId: duty.subject_id,
        memberId: ctx.member.id,
        signalType: "duty_update",
        source: "system",
        value: { title: duty.title, status: "done" },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
