import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";

export const dynamic = "force-dynamic";

/** "I'll handle transport" — the tap that closes tomorrow's biggest gap. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const { id } = await params;
    const apptId = z.string().uuid().safeParse(id);
    if (!apptId.success) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const updated = await withUser(userId, async (db) => {
      const res = await db.query(
        `update appointment
         set transport_confirmed = true,
             transport_owner_member_id = coalesce(transport_owner_member_id, $2)
         where id = $1 returning subject_id`,
        [apptId.data, ctx.member.id],
      );
      if (res.rows[0]) {
        await db.query(
          `update attention_event set status = 'resolved', resolved_at = now()
           where subject_id = $1 and kind = 'transport_unconfirmed' and status = 'open'`,
          [res.rows[0].subject_id],
        );
      }
      return res.rowCount ?? 0;
    });
    if (updated === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
