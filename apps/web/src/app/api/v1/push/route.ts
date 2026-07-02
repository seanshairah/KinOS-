import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(8).max(400),
  platform: z.enum(["ios", "android"]),
});

/** Register a native push token — explicit, revocable, per device. */
export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad token" }, { status: 400 });

    await withUser(userId, async (db) => {
      await db.query(
        `insert into push_subscription (member_id, endpoint, keys)
         values ($1, $2, $3)
         on conflict (endpoint) do update set keys = excluded.keys`,
        [
          ctx.member.id,
          `expo:${parsed.data.token}`,
          JSON.stringify({ kind: "expo", platform: parsed.data.platform }),
        ],
      );
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const parsed = schema.pick({ token: true }).safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad token" }, { status: 400 });
    await withUser(userId, async (db) => {
      await db.query(`delete from push_subscription where endpoint = $1`, [
        `expo:${parsed.data.token}`,
      ]);
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
