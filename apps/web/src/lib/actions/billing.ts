"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PLANS, type PlanId } from "@kinos/config";
import { createSubscriptionCheckout, isStripeConfigured } from "@kinos/payments";
import { requireFamilyContext } from "../data/context";
import type { ActionResult } from "./workspace";

/**
 * Plan upgrades — an admin picks a plan, Stripe holds the card, the
 * webhook flips the workspace when payment settles. Nothing here trusts
 * the browser: plan and workspace ride in checkout metadata and the
 * webhook is signature-verified.
 */

const upgradeSchema = z.object({
  planId: z.enum(["family_core", "family_plus", "diaspora_care", "family_premium"]),
});

export async function upgradePlanAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  if (ctx.member.role !== "admin") {
    return { ok: false, message: "Only an admin can change the family's plan." };
  }
  const parsed = upgradeSchema.safeParse({ planId: formData.get("planId") });
  if (!parsed.success) return { ok: false, message: "Pick a plan." };

  const plan = PLANS[parsed.data.planId as PlanId];
  if (!plan.available || plan.priceCentsMonthly <= 0) {
    return { ok: false, message: "That plan isn't available yet." };
  }
  if (!isStripeConfigured()) {
    return {
      ok: false,
      message: "Card payments aren't switched on yet. This will open soon.",
    };
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "kinos.family";
  const base = `${proto}://${host}`;

  const session = await createSubscriptionCheckout({
    workspaceId: ctx.workspace.id,
    planId: plan.id,
    priceCents: plan.priceCentsMonthly,
    planName: plan.name,
    successUrl: `${base}/app/settings?plan=upgraded`,
    cancelUrl: `${base}/app/settings?plan=cancelled`,
  });
  redirect(session.url);
}
