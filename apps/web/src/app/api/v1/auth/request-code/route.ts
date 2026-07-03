import { NextResponse } from "next/server";
import { z } from "zod";
import { requestSignInCode, serverError } from "@/lib/api/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "a real email address, please" }, { status: 400 });
    }
    // Codes are precious: 5 per address and 20 per caller per 15 minutes.
    const email = parsed.data.email.toLowerCase();
    const [byEmail, byIp] = await Promise.all([
      rateLimit(`code:email:${email}`, 5, 900),
      rateLimit(`code:ip:${clientIp(req)}`, 20, 900),
    ]);
    if (!byEmail || !byIp) {
      return NextResponse.json(
        { error: "Too many codes requested. Try again in a little while." },
        { status: 429 },
      );
    }
    await requestSignInCode(email);
    // Same answer whether or not the address is known — no address probing.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
