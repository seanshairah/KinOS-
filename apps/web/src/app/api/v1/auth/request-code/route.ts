import { NextResponse } from "next/server";
import { z } from "zod";
import { requestSignInCode, serverError } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "a real email address, please" }, { status: 400 });
    }
    await requestSignInCode(parsed.data.email);
    // Same answer whether or not the address is known — no address probing.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
