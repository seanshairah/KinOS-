import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured, serviceQuery } from "@kinos/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public waitlist capture. Rate-limited per address and per caller so it
 * can't be used to flood the list; the answer is always the same shape,
 * so it can't be used to probe who has already joined.
 */
const schema = z.object({
  email: z.string().email().max(200),
  source: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "a real email address, please" }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "not ready yet" }, { status: 503 });
  }

  const email = parsed.data.email.toLowerCase();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`waitlist:email:${email}`, 3, 3600),
    rateLimit(`waitlist:ip:${clientIp(req)}`, 15, 3600),
  ]);
  if (!byEmail || !byIp) {
    // Quietly succeed rather than reveal the limit — the family shouldn't
    // see machinery, and an abuser shouldn't get a signal.
    return NextResponse.json({ ok: true });
  }

  try {
    const referrer = req.headers.get("referer")?.slice(0, 300) ?? null;
    await serviceQuery(`select join_waitlist($1, $2, $3)`, [
      email,
      parsed.data.source ?? "site",
      referrer,
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "couldn't save that — try again" }, { status: 500 });
  }
}
