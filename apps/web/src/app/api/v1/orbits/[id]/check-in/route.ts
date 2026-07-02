import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";
import { getFamilyContext } from "@/lib/data/context";
import { captureSignal } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const schema = z.object({
  mood: z.enum(["good", "okay", "low", "unwell"]),
  ate: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const ctx = await getFamilyContext(userId);
    if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });

    const { id } = await params;
    const subjectId = z.string().uuid().safeParse(id);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!subjectId.success || !parsed.success) {
      return NextResponse.json({ error: "pick how they're doing today" }, { status: 400 });
    }

    const result = await captureSignal(userId, {
      subjectId: subjectId.data,
      memberId: ctx.member.id,
      signalType: "checkin",
      source: "manual_checkin",
      value: {
        mood: parsed.data.mood,
        ...(parsed.data.ate === undefined ? {} : { ate: parsed.data.ate }),
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      },
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
