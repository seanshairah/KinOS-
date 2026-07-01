"use server";

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
