"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { requireFamilyContext } from "../data/context";
import type { ActionResult } from "./workspace";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function savePushSubscriptionAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = subscriptionSchema.safeParse(
    JSON.parse(String(formData.get("subscription") ?? "{}")),
  );
  if (!parsed.success) return { ok: false, message: "That subscription looked malformed." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into push_subscription (member_id, endpoint, keys)
       values ($1, $2, $3)
       on conflict (endpoint) do update set keys = excluded.keys`,
      [ctx.member.id, parsed.data.endpoint, JSON.stringify(parsed.data.keys)],
    );
  });
  return { ok: true };
}

export async function removePushSubscriptionAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const endpoint = z.string().url().parse(formData.get("endpoint"));
  await withUser(ctx.userId, async (db) => {
    await db.query(`delete from push_subscription where endpoint = $1`, [endpoint]);
  });
  return { ok: true };
}

/**
 * How a member is reached. Each person sets their own phone number and
 * which channels may reach them — under RLS a member may only edit their
 * own row, so nobody changes how someone else is reached.
 */
const reachSchema = z.object({ phone: z.string().max(32).optional() });

export async function setReachPreferencesAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = reachSchema.safeParse({ phone: formData.get("phone") ?? undefined });
  if (!parsed.success) return { ok: false, message: "Check the number and try again." };

  const phone = parsed.data.phone?.trim() || null;
  const prefs = {
    push: formData.has("push"),
    email: formData.has("email"),
    whatsapp: formData.has("whatsapp"),
    sms: formData.has("sms"),
  };
  await withUser(ctx.userId, async (db) => {
    await db.query(
      `update family_member set phone = $2, channel_prefs = $3
       where id = $1 and user_id = $4`,
      [ctx.member.id, phone, JSON.stringify(prefs), ctx.userId],
    );
  });
  revalidatePath("/app/settings");
  return { ok: true };
}
