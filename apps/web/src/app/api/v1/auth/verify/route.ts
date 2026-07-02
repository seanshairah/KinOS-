import { NextResponse } from "next/server";
import { z } from "zod";
import { serverError, verifySignInCode } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "that code doesn't look right" }, { status: 400 });
    }
    const session = await verifySignInCode(parsed.data.email, parsed.data.code);
    if (!session) {
      return NextResponse.json(
        { error: "that code didn't match or has expired — request a fresh one" },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true, sessionToken: session.sessionToken });
  } catch (err) {
    return serverError(err);
  }
}
