import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** The member's own notification feed — RLS scopes it to them alone. */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const rows = await withUser(userId, async (db) => {
      const res = await db.query(
        `select id, title, body, link, priority, read_at, sent_at
         from notification
         where channel = 'in_app'
         order by sent_at desc limit 40`,
      );
      return res.rows;
    });
    return NextResponse.json({
      notifications: rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        link: n.link,
        priority: n.priority,
        readAt: n.read_at,
        sentAt: n.sent_at,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const markSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
});

/** Mark notifications read — the given ids, or everything unread. */
export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const parsed = markSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
    await withUser(userId, async (db) => {
      if (parsed.data.ids?.length) {
        await db.query(
          `update notification set read_at = now()
           where read_at is null and id = any($1::uuid[])`,
          [parsed.data.ids],
        );
      } else {
        await db.query(`update notification set read_at = now() where read_at is null`);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
