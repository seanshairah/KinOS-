/**
 * Double-entry ledger math — pure and fully tested. The database RPCs
 * (record_contribution / record_expense) are the write path; these
 * functions are the invariant checkers and balance derivation used by
 * reconciliation and reporting.
 */

export interface LedgerEntry {
  refType: "contribution" | "expense" | "reimbursement" | "adjustment";
  refId?: string | null;
  debit: number;
  credit: number;
  at: string;
}

export class LedgerInvariantError extends Error {}

export function validateEntry(entry: LedgerEntry): void {
  if (entry.debit < 0 || entry.credit < 0) {
    throw new LedgerInvariantError("ledger amounts must be non-negative");
  }
  if (entry.debit > 0 && entry.credit > 0) {
    throw new LedgerInvariantError("an entry is a debit or a credit, never both");
  }
  if (entry.debit === 0 && entry.credit === 0) {
    throw new LedgerInvariantError("an entry must move value");
  }
}

/** Balance = sum(credits) - sum(debits). Money in credits the pot. */
export function computeBalance(entries: LedgerEntry[]): number {
  let balance = 0;
  for (const e of entries) {
    validateEntry(e);
    balance += e.credit - e.debit;
  }
  return round2(balance);
}

/** Verify a stored pot balance matches its ledger — drift means a bug. */
export function reconciles(entries: LedgerEntry[], storedBalance: number): boolean {
  return Math.abs(computeBalance(entries) - round2(storedBalance)) < 0.005;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
