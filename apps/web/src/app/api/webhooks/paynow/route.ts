import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@kinos/db";
import {
  decideReconciliation,
  paynowStatusToStatus,
  verifyStatusCallback,
  type IntentSnapshot,
} from "@kinos/payments";

/**
 * Paynow (EcoCash / Zimbabwe) result URL — hash-verified against the
 * integration key, then reconciled through the same idempotent state
 * machine as Stripe.
 */
export async function POST(request: NextRequest) {
  const key = process.env.PAYNOW_INTEGRATION_KEY;
  if (!key) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const verified = verifyStatusCallback(await request.text(), key);
  if (!verified) return NextResponse.json({ error: "invalid hash" }, { status: 400 });

  const status = paynowStatusToStatus(verified.status);
  if (!status) return NextResponse.json({ received: true });

  await withService(async (db) => {
    const res = await db.query(
      `select id, status, amount, currency, pot_id from payment_intent where id = $1 for update`,
      [verified.reference],
    );
    const row = res.rows[0];
    if (!row) return;

    const snapshot: IntentSnapshot = {
      id: row.id,
      status: row.status,
      amount: Number(row.amount),
      currency: row.currency,
      potId: row.pot_id,
    };
    const decision = decideReconciliation(snapshot, status);
    if (!decision.nextStatus) return;

    await db.query(
      `update payment_intent set status = $2, external_id = coalesce(external_id, $3) where id = $1`,
      [snapshot.id, decision.nextStatus, verified.paynowReference],
    );

    if (decision.settle && snapshot.potId) {
      const contribution = await db.query(
        `insert into contribution (pot_id, amount, currency, note, payment_intent_id)
         values ($1, $2, $3, 'EcoCash / Paynow', $4) returning id`,
        [snapshot.potId, snapshot.amount, snapshot.currency, snapshot.id],
      );
      await db.query(
        `insert into ledger_entry (pot_id, ref_type, ref_id, credit)
         values ($1, 'contribution', $2, $3)`,
        [snapshot.potId, contribution.rows[0]!.id, snapshot.amount],
      );
      await db.query(`update money_pot set balance = balance + $2 where id = $1`, [
        snapshot.potId,
        snapshot.amount,
      ]);
    }
  });

  return NextResponse.json({ received: true });
}
