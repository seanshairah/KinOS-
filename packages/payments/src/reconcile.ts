/**
 * Idempotent payment reconciliation.
 *
 * Webhooks retry; users double-click; gateways replay. Reconciliation is
 * therefore a pure state machine keyed on our payment_intent row:
 * a succeeded intent is settled exactly once (settlement writes the
 * contribution + ledger through the DB RPC in one transaction), and every
 * other transition is a no-op if already applied.
 */

export type IntentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface IntentSnapshot {
  id: string;
  status: IntentStatus;
  amount: number;
  currency: string;
  potId: string | null;
}

export interface ReconcileDecision {
  /** New status to store, or null when nothing should change. */
  nextStatus: IntentStatus | null;
  /** True exactly once per intent lifetime: settle money into the pot. */
  settle: boolean;
}

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
  "succeeded",
  "failed",
  "cancelled",
]);

export function decideReconciliation(
  current: IntentSnapshot,
  incoming: IntentStatus,
): ReconcileDecision {
  // Terminal states never move — replays and late events are no-ops.
  if (TERMINAL.has(current.status)) {
    return { nextStatus: null, settle: false };
  }
  if (incoming === current.status) {
    return { nextStatus: null, settle: false };
  }
  if (incoming === "succeeded") {
    return { nextStatus: "succeeded", settle: current.potId !== null };
  }
  return { nextStatus: incoming, settle: false };
}

/** Map a Stripe checkout event to our intent status. */
export function stripeEventToStatus(eventType: string): IntentStatus | null {
  switch (eventType) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return "succeeded";
    case "checkout.session.async_payment_failed":
      return "failed";
    case "checkout.session.expired":
      return "cancelled";
    default:
      return null;
  }
}

/** Map a Paynow status string to our intent status. */
export function paynowStatusToStatus(status: string): IntentStatus | null {
  switch (status.toLowerCase()) {
    case "paid":
    case "awaiting delivery":
    case "delivered":
      return "succeeded";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    case "created":
    case "sent":
      return "processing";
    default:
      return null;
  }
}
