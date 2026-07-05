import { createHmac, timingSafeEqual } from "node:crypto";
import { parseSmsCheckinReply } from "@kinos/engine";
import { withService } from "@kinos/db";
import { sendSms, smsConfigured, toE164 } from "./channels";
import { captureSignalAsService } from "./pipeline";

/**
 * The no-app check-in. The person at the centre of an Orbit gets a text —
 * "How are you today?" — and answers with a digit or a word, in English,
 * Shona or Ndebele. No app, no account, no password: the phone they already
 * have. Their reply becomes a Life Signal; an unwell reply raises attention
 * for the family exactly as an app check-in would.
 */

/**
 * The daily ask. Runs on the 15-minute sweep; the per-subject date stamp
 * makes it fire once, at the first sweep after 08:00 in the subject's own
 * timezone — never at night, and never after someone already checked in.
 */
export async function sendSmsCheckinPrompts(): Promise<number> {
  if (!smsConfigured()) return 0;
  return withService(async (db) => {
    const due = await db.query(
      `select s.id, s.phone, s.display_name, s.timezone
       from care_subject s
       where s.sms_checkin and s.phone is not null
         and s.last_sms_prompt_on is distinct from (now() at time zone s.timezone)::date
         and extract(hour from now() at time zone s.timezone) between 8 and 18
         and not exists (
           select 1 from life_signal l
           where l.subject_id = s.id and l.signal_type = 'checkin'
             and (l.occurred_at at time zone s.timezone)::date
                 = (now() at time zone s.timezone)::date
         )`,
    );

    let sent = 0;
    for (const s of due.rows) {
      const ok = await sendSms({
        to: s.phone,
        title: `How are you today, ${s.display_name}? Reply 1 Doing well, 2 Okay, 3 Not feeling well.`,
      });
      // Stamp even on failure: one quiet retry-free ask per day beats a
      // misconfigured account texting someone every fifteen minutes.
      await db.query(
        `update care_subject
         set last_sms_prompt_on = (now() at time zone timezone)::date where id = $1`,
        [s.id],
      );
      if (ok) sent++;
    }
    return sent;
  });
}

const CONFIRMATIONS: Record<string, string> = {
  good: "Lovely — the family will see you're doing well today.",
  okay: "Thank you — noted, and the family can see it.",
  unwell: "Thank you for saying. The family has been told, so someone can check on you soon.",
};

const RETRY_HINT =
  "Sorry, I didn't catch that. Reply 1 (doing well), 2 (okay) or 3 (not feeling well).";

// Carrier keywords — Twilio's own opt-out handling owns these; stay silent.
const CARRIER_WORDS = /^(stop|stopall|unstop|start|help|info|cancel|end|quit|unsubscribe)$/i;

/**
 * Handle one inbound SMS. The caller has already verified the Twilio
 * signature; this matches the sender to a subject, parses the reply, and
 * records the check-in. Returns the reply to text back, or null for silence.
 */
export async function handleInboundSms(from: string, body: string): Promise<string | null> {
  if (CARRIER_WORDS.test(body.trim())) return null;

  const phone = toE164(from);
  if (!phone) return null;

  const subject = await withService(async (db) => {
    const res = await db.query(
      `select id, display_name from care_subject
       where sms_checkin and phone = $1 limit 1`,
      [phone],
    );
    return res.rows[0] as { id: string; display_name: string } | undefined;
  });
  // Unknown sender: stay silent — replying would confirm the number is live.
  if (!subject) return null;

  const parsed = parseSmsCheckinReply(body);
  if (!parsed) return RETRY_HINT;

  const result = await captureSignalAsService({
    subjectId: subject.id,
    signalType: "checkin",
    source: "sms_checkin",
    value: { mood: parsed.mood, via: "sms" },
  });
  if (!result.ok) return "Something went wrong on our side. Please try again in a moment.";
  return CONFIRMATIONS[parsed.mood] ?? null;
}

/**
 * Twilio request signature (X-Twilio-Signature): base64 HMAC-SHA1 of the
 * exact webhook URL plus each POST parameter name+value, sorted by name,
 * keyed with the account's auth token.
 */
export function validTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = createHmac("sha1", token).update(data, "utf8").digest();
  const given = Buffer.from(signature, "base64");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
