import webpush from "web-push";
import { withService } from "@kinos/db";
import { sendSms, sendWhatsApp } from "./channels";

/**
 * Notification channel abstraction — in-app row always; web push, email,
 * WhatsApp and SMS best-effort on top, each respecting the member's own
 * channel preferences and gated by configuration. Callers never change.
 */

interface ChannelPrefs {
  push?: boolean;
  email?: boolean;
  whatsapp?: boolean;
  sms?: boolean;
}
const DEFAULT_PREFS: ChannelPrefs = { push: true, email: true, whatsapp: true, sms: false };

export interface Notice {
  memberId: string;
  title: string;
  body?: string;
  link?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

let vapidReady = false;
function ensureVapid(): boolean {
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidReady) {
    webpush.setVapidDetails("mailto:care@kinos.family", pub, priv);
    vapidReady = true;
  }
  return true;
}

export async function notifyMember(notice: Notice): Promise<void> {
  await withService(async (db) => {
    await db.query(
      `insert into notification (member_id, channel, title, body, link, priority)
       values ($1, 'in_app', $2, $3, $4, $5)`,
      [
        notice.memberId,
        notice.title,
        notice.body ?? null,
        notice.link ?? null,
        notice.priority ?? "normal",
      ],
    );

    if (!ensureVapid()) return;
    const subs = await db.query(
      `select endpoint, keys from push_subscription where member_id = $1`,
      [notice.memberId],
    );
    for (const sub of subs.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: notice.title,
            body: notice.body ?? "",
            link: notice.link ?? "/app",
          }),
        );
      } catch {
        // A dead endpoint is routine — clean it up quietly.
        await db.query(`delete from push_subscription where endpoint = $1`, [
          sub.endpoint,
        ]);
      }
    }
  });

  await fanOutExternal(notice);
}

/**
 * Email / WhatsApp / SMS to a member, respecting their channel preferences.
 * Low-priority notices (routine briefs) stay in-app + push only. SMS is
 * reserved for high/urgent notices — it costs, and the family shouldn't be
 * texted about a settled duty.
 */
async function fanOutExternal(notice: Notice): Promise<void> {
  const priority = notice.priority ?? "normal";
  if (priority === "low") return;

  const contact = await withService(async (db) => {
    const res = await db.query(
      `select u.email, m.phone, m.channel_prefs from family_member m
       join app_user u on u.id = m.user_id where m.id = $1`,
      [notice.memberId],
    );
    return res.rows[0] as
      | { email: string | null; phone: string | null; channel_prefs: ChannelPrefs }
      | undefined;
  });
  if (!contact) return;
  const prefs = { ...DEFAULT_PREFS, ...(contact.channel_prefs ?? {}) };

  if (contact.email && prefs.email) await sendEmail(contact.email, notice);
  if (contact.phone && prefs.whatsapp) {
    await sendWhatsApp({ to: contact.phone, title: notice.title, body: notice.body });
  }
  if (contact.phone && prefs.sms && (priority === "high" || priority === "urgent")) {
    await sendSms({ to: contact.phone, title: notice.title, body: notice.body });
  }
}

async function sendEmail(email: string, notice: Notice): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "KinOS <brief@kinos.family>",
      to: email,
      subject: notice.title,
      text: `${notice.body ?? notice.title}\n\nOpen KinOS: ${
        process.env.NEXT_PUBLIC_APP_URL ?? "https://kinos.family"
      }${notice.link ?? "/app"}`,
    }),
  }).catch(() => {});
}
