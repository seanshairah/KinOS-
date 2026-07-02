import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ mode: z.enum(["resolved", "ack", "snoozed"]) });

/** Act on one attention item: handled, seen, or later today. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const { id } = await params;
    const eventId = z.string().uuid().safeParse(id);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!eventId.success || !parsed.success) {
      return NextResponse.json({ error: "that didn't make sense" }, { status: 400 });
    }
    const mode = parsed.data.mode;
    const updated = await withUser(userId, async (db) => {
      const res = await db.query(
        mode === "resolved"
          ? `update attention_event set status = 'resolved', resolved_at = now()
             where id = $1 and status in ('open','ack','snoozed') returning id`
          : mode === "snoozed"
            ? `update attention_event set status = 'snoozed', escalate_at = now() + interval '4 hours'
               where id = $1 and status in ('open','ack','snoozed') returning id`
            : `update attention_event set status = 'ack'
               where id = $1 and status in ('open','ack') returning id`,
        [eventId.data],
      );
      return res.rowCount ?? 0;
    });
    if (!updated) return NextResponse.json({ error: "already settled" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
