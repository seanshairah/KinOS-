"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withUser, withService } from "@kinos/db";
import {
  createContributionCheckout,
  isStripeConfigured,
} from "@kinos/payments";
import { requireFamilyContext } from "../data/context";
import type { ActionResult } from "./workspace";

const potSchema = z.object({
  name: z.string().trim().min(2).max(80),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  currency: z.enum(["USD", "ZWG", "ZAR", "GBP", "EUR"]).default("USD"),
});

export async function createPotAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = potSchema.safeParse({
    name: formData.get("name"),
    subjectId: formData.get("subjectId") ?? "",
    currency: formData.get("currency") ?? "USD",
  });
  if (!parsed.success) return { ok: false, message: "Give the pot a name." };

  await withUser(ctx.userId, async (db) => {
    await db.query(
      `insert into money_pot (workspace_id, subject_id, name, currency)
       values ($1, $2, $3, $4)`,
      [ctx.workspace.id, parsed.data.subjectId || null, parsed.data.name, parsed.data.currency],
    );
  });
  revalidatePath("/app/money");
  return { ok: true };
}

const contributionSchema = z.object({
  potId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  note: z.string().max(200).optional().or(z.literal("")),
  method: z.enum(["record", "stripe"]).default("record"),
});

export async function contributeAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = contributionSchema.safeParse({
    potId: formData.get("potId"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? "",
    method: formData.get("method") ?? "record",
  });
  if (!parsed.success) return { ok: false, message: "Enter a positive amount." };

  const pot = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select * from money_pot where id = $1`, [parsed.data.potId]);
    return res.rows[0];
  });
  if (!pot) return { ok: false, message: "That pot isn't visible to you." };

  if (parsed.data.method === "stripe") {
    if (!isStripeConfigured()) {
      return { ok: false, message: "Card payments aren't set up yet — record the contribution instead." };
    }
    const intent = await withService(async (db) => {
      const res = await db.query(
        `insert into payment_intent (workspace_id, pot_id, provider, amount, currency, idempotency_key)
         values ($1, $2, 'stripe', $3, $4, $5) returning id`,
        [
          ctx.workspace.id,
          pot.id,
          parsed.data.amount,
          pot.currency,
          `stripe:${pot.id}:${ctx.member.id}:${Date.now()}`,
        ],
      );
      return res.rows[0]!.id as string;
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkout = await createContributionCheckout({
      paymentIntentId: intent,
      potName: pot.name,
      amount: parsed.data.amount,
      currency: pot.currency,
      successUrl: `${base}/app/money?paid=1`,
      cancelUrl: `${base}/app/money?cancelled=1`,
    });
    await withService((db) =>
      db.query(`update payment_intent set external_id = $2 where id = $1`, [
        intent,
        checkout.externalId,
      ]),
    );
    redirect(checkout.url);
  }

  // Direct record (cash/EcoCash handled outside, or reconciliation later).
  await withUser(ctx.userId, async (db) => {
    await db.query(`select record_contribution($1, $2, $3, $4)`, [
      parsed.data.potId,
      parsed.data.amount,
      pot.currency,
      parsed.data.note || null,
    ]);
  });

  revalidatePath("/app/money");
  return { ok: true };
}

const expenseSchema = z.object({
  potId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  category: z.enum([
    "medication",
    "groceries",
    "transport",
    "utilities",
    "school",
    "care",
    "medical",
    "other",
  ]),
  note: z.string().max(200).optional().or(z.literal("")),
});

export async function addExpenseAction(formData: FormData): Promise<ActionResult> {
  const ctx = await requireFamilyContext();
  const parsed = expenseSchema.safeParse({
    potId: formData.get("potId"),
    amount: formData.get("amount"),
    category: formData.get("category") ?? "other",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Enter the amount and category." };

  // Optional receipt image → Vercel Blob.
  let receiptUrl: string | null = null;
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(
        `${ctx.workspace.id}/receipts/${Date.now()}-${receipt.name}`,
        receipt,
        { access: "public", addRandomSuffix: true },
      );
      receiptUrl = blob.url;
    } catch {
      // Expense still records without the image.
    }
  }

  const pot = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select currency from money_pot where id = $1`, [
      parsed.data.potId,
    ]);
    return res.rows[0];
  });
  if (!pot) return { ok: false, message: "That pot isn't visible to you." };

  await withUser(ctx.userId, async (db) => {
    await db.query(`select record_expense($1, $2, $3, $4, $5, $6)`, [
      parsed.data.potId,
      parsed.data.amount,
      pot.currency,
      parsed.data.category,
      parsed.data.note || null,
      receiptUrl,
    ]);
  });

  revalidatePath("/app/money");
  return { ok: true };
}
