import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
import { getFamilyContext } from "@/lib/data/context";
import { captureSignal } from "@/lib/pipeline";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The web check-in, over cookie auth — the same session the app already
 * holds. It exists so the check-in can be sent from a client component,
 * which is what lets the offline queue replay it when the connection comes
 * back. `capturedAt` preserves the moment the check-in was actually tapped,
 * so one queued on a morning walk still reads as morning when it finally
 * sends. The server-action path (submitCheckinAction) stays for no-JS forms.
 */
const schema = z.object({
  subjectId: z.string().uuid(),
  mood: z.enum(["good", "okay", "low", "unwell"]),
  ate: z.enum(["yes", "no"]).optional(),
  note: z.string().max(2000).optional(),
  capturedAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  if (!(await rateLimit(`checkin:${userId}`, 60, 3600))) {
    return NextResponse.json({ error: "too many check-ins just now" }, { status: 429 });
  }

  const ctx = await getFamilyContext(userId);
  if (!ctx) return NextResponse.json({ error: "join a family space first" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "pick how they're doing today" }, { status: 400 });
  }

  const result = await captureSignal(userId, {
    subjectId: parsed.data.subjectId,
    memberId: ctx.member.id,
    signalType: "checkin",
    source: "manual_checkin",
    occurredAt: parsed.data.capturedAt,
    value: {
      mood: parsed.data.mood,
      ...(parsed.data.ate ? { ate: parsed.data.ate === "yes" } : {}),
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    },
  });
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// A GET is used by the client only to confirm the session is reachable (i.e.
// that we're genuinely online with a valid cookie) before deciding to queue.
export async function GET() {
  const userId = await currentUserId();
  return NextResponse.json({ ok: Boolean(userId) }, { status: userId ? 200 : 401 });
}
