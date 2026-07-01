import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@kinos/db";
import {
  decideReconciliation,
  stripeEventToStatus,
  verifyStripeWebhook,
  type IntentSnapshot,
} from "@kinos/payments";

/**
 * Stripe webhook — signature-verified, reconciled idempotently. A
 * succeeded checkout settles the contribution into the pot exactly once
 * (ledger + balance in one transaction); replays are no-ops.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    event = verifyStripeWebhook(await request.text(), signature);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const status = stripeEventToStatus(event.type);
  if (!status) return NextResponse.json({ received: true });

  const session = event.data.object as {
    id: string;
    client_reference_id?: string | null;
    metadata?: Record<string, string>;
  };
  const intentId =
    session.client_reference_id ?? session.metadata?.kinos_payment_intent;
  if (!intentId) return NextResponse.json({ received: true });

  await withService(async (db) => {
    const res = await db.query(
      `select id, status, amount, currency, pot_id from payment_intent where id = $1 for update`,
      [intentId],
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

    await db.query(`update payment_intent set status = $2 where id = $1`, [
      intentId,
      decision.nextStatus,
    ]);

    if (decision.settle && snapshot.potId) {
      const contribution = await db.query(
        `insert into contribution (pot_id, amount, currency, note, payment_intent_id)
         values ($1, $2, $3, 'Card payment', $4) returning id`,
        [snapshot.potId, snapshot.amount, snapshot.currency, intentId],
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
