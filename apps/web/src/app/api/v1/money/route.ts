import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@kinos/db";
import { apiUserId, serverError, unauthorized } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** The Money Pot in the hand: balance, the flow, and a way to add to it. */
export async function GET(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const data = await withUser(userId, async (db) => {
      const pots = await db.query(
        `select p.id, p.name, p.currency, p.balance, s.display_name as subject_name
         from money_pot p left join care_subject s on s.id = p.subject_id
         order by p.created_at`,
      );
      const entries = await db.query(
        `select * from (
           select c.id, 'contribution' as kind, c.amount, c.currency, c.note, null as category,
                  c.at, m.display_name as member_name, c.pot_id
           from contribution c left join family_member m on m.id = c.member_id
           union all
           select e.id, 'expense' as kind, e.amount, e.currency, e.note, e.category,
                  e.at, m.display_name as member_name, e.pot_id
           from expense e left join family_member m on m.id = e.member_id
         ) flow
         order by at desc limit 30`,
      );
      return { pots: pots.rows, entries: entries.rows };
    });
    return NextResponse.json({
      pots: data.pots.map((p) => ({
        id: p.id,
        name: p.name,
        currency: p.currency,
        balance: Number(p.balance),
        subjectName: p.subject_name,
      })),
      entries: data.entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        amount: Number(e.amount),
        currency: e.currency,
        note: e.note,
        category: e.category,
        at: e.at,
        memberName: e.member_name,
        potId: e.pot_id,
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}

const writeSchema = z.object({
  potId: z.string().uuid(),
  kind: z.enum(["contribution", "expense"]),
  amount: z.coerce.number().positive().max(1_000_000),
  note: z.string().trim().max(300).optional(),
  category: z
    .enum(["medication", "groceries", "transport", "utilities", "school", "care", "medical", "other"])
    .default("other"),
});

export async function POST(req: Request) {
  try {
    const userId = await apiUserId(req);
    if (!userId) return unauthorized();
    const parsed = writeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "an amount and a pot are needed" }, { status: 400 });
    }
    const { potId, kind, amount, note, category } = parsed.data;
    // The RPCs keep the ledger and balance honest in one transaction.
    await withUser(userId, async (db) => {
      const pot = await db.query(`select currency from money_pot where id = $1`, [potId]);
      if (!pot.rows[0]) throw new Error("pot not found");
      const currency = pot.rows[0].currency as string;
      if (kind === "contribution") {
        await db.query(`select record_contribution($1, $2, $3, $4)`, [
          potId,
          amount,
          currency,
          note ?? null,
        ]);
      } else {
        await db.query(`select record_expense($1, $2, $3, $4, $5, null)`, [
          potId,
          amount,
          currency,
          category,
          note ?? null,
        ]);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
