import { NextResponse } from "next/server";
import { handleInboundSms, validTwilioSignature } from "@/lib/sms-checkin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Twilio inbound SMS webhook — the other half of the no-app check-in.
 * Point the Twilio number's "A message comes in" at POST {app}/api/hooks/sms.
 * Every request is verified against X-Twilio-Signature before anything is
 * read; a bad signature 403s, and an unconfigured account 404s so the
 * endpoint reveals nothing.
 */

function twiml(message?: string | null): NextResponse {
  const inner = message
    ? `<Message>${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</Message>`
    : "";
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { headers: { "content-type": "text/xml" } },
  );
}

export async function POST(req: Request) {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const raw = await req.text();
  const form = new URLSearchParams(raw);
  const params: Record<string, string> = {};
  for (const [k, v] of form) params[k] = v;

  // Twilio signs the exact public URL it was configured with.
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kinos.family"}/api/hooks/sms`;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  if (!validTwilioSignature(url, params, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const from = params.From ?? "";
  const body = params.Body ?? "";
  if (!from) return twiml();

  const [byFrom, byIp] = await Promise.all([
    rateLimit(`sms:in:${from}`, 12, 3600),
    rateLimit(`sms:in:ip:${clientIp(req)}`, 120, 3600),
  ]);
  if (!byFrom || !byIp) return twiml();

  try {
    return twiml(await handleInboundSms(from, body));
  } catch (err) {
    console.error("[hooks/sms]", err);
    return twiml();
  }
}
