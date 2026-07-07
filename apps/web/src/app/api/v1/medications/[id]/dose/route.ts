import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { captureSignal } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const schema = z.object({
  subjectId: z.string().uuid(),
  status: z.enum(["taken", "missed", "skipped"]).default("taken"),
});

/** Mark a dose — mirrors the web exactly, open attention resolves itself. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });
    const { id } = await params;
    const medicationId = z.string().uuid().safeParse(id);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!medicationId.success || !parsed.success) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    const { subjectId, status } = parsed.data;

    await withUser(userId, async (db) => {
      await db.query(
        `insert into dose_log (medication_id, subject_id, status, member_id)
         values ($1, $2, $3, $4)`,
        [medicationId.data, subjectId, status, ctx.member.id],
      );
      if (status === "taken") {
        await db.query(
          `update attention_event set status = 'resolved', resolved_at = now()
           where subject_id = $1 and kind = 'missed_dose' and status = 'open'`,
          [subjectId],
        );
      }
    });
    await captureSignal(userId, {
      subjectId,
      memberId: ctx.member.id,
      signalType: "medication_dose",
      source: "manual_checkin",
      value: { medication_id: medicationId.data, status },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
