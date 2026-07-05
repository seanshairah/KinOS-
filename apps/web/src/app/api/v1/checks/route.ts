import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { CHECK_TYPES, composeCheckPrompt, inQuietMode, quietModeLine } from "@kinos/engine";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { listChecksAwaitingMe } from "@/lib/data/checks";
import { logTrust } from "@/lib/data/operating";
import { notifyMember } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Request Check for the mobile app.
 *  GET  — requests waiting on the signed-in person (they hold the centre),
 *         each carrying the exact words to show.
 *  POST — ask for a check, quiet-mode aware. Consent is enforced by RLS:
 *         a member without standing simply cannot insert the row.
 */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const awaiting = await listChecksAwaitingMe(userId);
    return NextResponse.json({
      checks: awaiting.map((c) => ({
        id: c.id,
        subjectId: c.subject_id,
        subjectName: c.subject_name,
        checkType: c.check_type,
        status: c.status,
        prompt: composeCheckPrompt(c.requester_name ?? "Your family", c.check_type, c.message),
        respondBy: c.respond_by,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const createSchema = z.object({
  subjectId: z.string().uuid(),
  checkType: z.enum(CHECK_TYPES),
  message: z.string().trim().max(280).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "pick a check to ask for" }, { status: 400 });
    }
    const { subjectId, checkType, message } = parsed.data;

    const out = await withUser(userId, async (db) => {
      const subject = await db.query(
        `select display_name, timezone, quiet_until, quiet_note from care_subject where id = $1`,
        [subjectId],
      );
      const s = subject.rows[0];
      if (!s) return { status: 404 as const, error: "that orbit is out of reach" };
      if (inQuietMode(s.quiet_until, new Date())) {
        return {
          status: 409 as const,
          error: quietModeLine(s.display_name, s.quiet_until, s.timezone, s.quiet_note),
        };
      }
      const open = await db.query(
        `select 1 from wellness_check_request
         where subject_id = $1 and status in ('pending','later') and respond_by > now() limit 1`,
        [subjectId],
      );
      if (open.rows[0]) {
        return {
          status: 409 as const,
          error: `${s.display_name} already has a check waiting — one ask at a time`,
        };
      }
      const inserted = await db.query(
        `insert into wellness_check_request (subject_id, requested_by, check_type, message)
         values ($1, $2, $3, $4) returning id`,
        [subjectId, ctx.member.id, checkType, message ?? null],
      );
      return { status: 200 as const, id: inserted.rows[0]!.id as string };
    });
    if (out.status !== 200) {
      return NextResponse.json({ error: out.error }, { status: out.status });
    }

    await logTrust(userId, {
      workspaceId: ctx.workspace.id,
      actorMemberId: ctx.member.id,
      action: "requested_check",
      subjectId,
      detail: checkType,
    });
    const centre = await withUser(userId, async (db) => {
      const res = await db.query(
        `select id from family_member
         where workspace_id = $1 and role = 'care_recipient' and user_id is not null`,
        [ctx.workspace.id],
      );
      return res.rows as { id: string }[];
    });
    for (const m of centre) {
      await notifyMember({
        memberId: m.id,
        title: `${ctx.member.display_name ?? "Family"} is asking for a quick wellness check`,
        body: "Share now, be reminded later, or decline — it's always your choice.",
        link: "/app",
      });
    }
    return NextResponse.json({ ok: true, id: out.id });
  } catch (err) {
    return serverError(err);
  }
}
