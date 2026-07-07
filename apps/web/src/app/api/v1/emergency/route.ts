import { NextResponse } from "next/server";
import { z } from "zod";
import { withService, withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";

export const dynamic = "force-dynamic";

/**
 * The Emergency Layer in the hand: who to call and what responders need.
 * KinOS is not an emergency service — if something is urgent, contact
 * local emergency or medical services first.
 */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const subjectId = new URL(req.url).searchParams.get("subject");
    const parsed = z.string().uuid().safeParse(subjectId);
    if (!parsed.success) return NextResponse.json({ error: "subject required" }, { status: 400 });

    const data = await withUser(userId, async (db) => {
      const profile = await db.query(
        `select blood_type, conditions, allergies, medications, instructions
         from emergency_profile where subject_id = $1`,
        [parsed.data],
      );
      const contacts = await db.query(
        `select id, name, phone, relationship, priority from emergency_contact
         where subject_id = $1 order by priority`,
        [parsed.data],
      );
      return { profile: profile.rows[0] ?? null, contacts: contacts.rows };
    });
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}

const alertSchema = z.object({
  subjectId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

/** Raise the alert: every member is told, urgently, and it's on the record. */
export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const parsed = alertSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
    const { subjectId, note } = parsed.data;

    await withUser(userId, async (db) => {
      await db.query(
        `insert into emergency_alert (subject_id, raised_by, note) values ($1, $2, $3)`,
        [subjectId, ctx.member.id, note ?? null],
      );
      await db.query(
        `insert into trust_log (workspace_id, actor_member_id, action, subject_id)
         values ($1, $2, 'raised_alert', $3)`,
        [ctx.workspace.id, ctx.member.id, subjectId],
      );
    });

    await withService(async (db) => {
      const members = await db.query(
        `select m.id from family_member m
         join care_subject s on s.workspace_id = m.workspace_id
         where s.id = $1 and m.user_id is not null`,
        [subjectId],
      );
      const subject = await db.query(`select display_name from care_subject where id = $1`, [
        subjectId,
      ]);
      const { notifyMember } = await import("@/lib/notify");
      for (const m of members.rows) {
        await notifyMember({
          memberId: m.id,
          title: `Emergency raised for ${subject.rows[0]?.display_name ?? "your loved one"}`,
          body: note ?? "Open the Emergency Layer for their medical summary and contacts.",
          link: `/app/emergency?subject=${subjectId}`,
          priority: "urgent",
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
