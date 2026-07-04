/**
 * External message channels beyond email: WhatsApp (Meta Cloud API) and
 * SMS (Twilio). Both degrade to no-ops when unconfigured, so the product
 * never depends on a channel being switched on. Phone numbers should be in
 * E.164 (+263…, +44…); a best-effort normaliser tidies common local forms.
 */

export interface OutboundMessage {
  to: string; // E.164 phone
  title: string;
  body?: string;
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM,
  );
}

/** Tidy a number toward E.164. Assumes Zimbabwe (+263) for bare local forms. */
export function toE164(raw: string): string | null {
  const trimmed = raw.replace(/[^\d+]/g, "");
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith("0")) return `+263${trimmed.slice(1)}`; // ZW local
  return `+${trimmed}`;
}

/**
 * WhatsApp via the Meta Cloud API. Outside the 24h customer window, only
 * approved templates deliver — so we send a template (name from
 * WHATSAPP_TEMPLATE, default "kinos_update") with the notice as the single
 * body parameter. Returns true on a 2xx.
 */
export async function sendWhatsApp(msg: OutboundMessage): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const to = toE164(msg.to);
  if (!to) return false;
  const template = process.env.WHATSAPP_TEMPLATE ?? "kinos_update";
  const text = [msg.title, msg.body].filter(Boolean).join(" — ").slice(0, 1024);
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: template,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
            components: [
              { type: "body", parameters: [{ type: "text", text }] },
            ],
          },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** SMS via Twilio's REST API. Kept for higher-priority notices (it costs). */
export async function sendSms(msg: OutboundMessage): Promise<boolean> {
  if (!smsConfigured()) return false;
  const to = toE164(msg.to);
  if (!to) return false;
  const text = [msg.title, msg.body].filter(Boolean).join(" — ").slice(0, 320);
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM!, Body: text }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
