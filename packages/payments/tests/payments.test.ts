import { describe, expect, it } from "vitest";
import {
  computeBalance,
  LedgerInvariantError,
  reconciles,
  validateEntry,
} from "../src/ledger";
import {
  buildInitiateBody,
  parseInitiateResponse,
  paynowHash,
  verifyStatusCallback,
} from "../src/paynow";
import {
  decideReconciliation,
  paynowStatusToStatus,
  stripeEventToStatus,
} from "../src/reconcile";

const at = "2026-07-01T08:00:00Z";

describe("ledger", () => {
  it("computes balance as credits minus debits", () => {
    const balance = computeBalance([
      { refType: "contribution", debit: 0, credit: 100, at },
      { refType: "contribution", debit: 0, credit: 50.5, at },
      { refType: "expense", debit: 41, credit: 0, at },
      { refType: "expense", debit: 23.5, credit: 0, at },
    ]);
    expect(balance).toBe(86);
  });

  it("rejects entries that both debit and credit", () => {
    expect(() =>
      validateEntry({ refType: "adjustment", debit: 5, credit: 5, at }),
    ).toThrow(LedgerInvariantError);
  });

  it("rejects zero-value and negative entries", () => {
    expect(() =>
      validateEntry({ refType: "adjustment", debit: 0, credit: 0, at }),
    ).toThrow(LedgerInvariantError);
    expect(() =>
      validateEntry({ refType: "expense", debit: -3, credit: 0, at }),
    ).toThrow(LedgerInvariantError);
  });

  it("detects drift between stored balance and ledger", () => {
    const entries = [
      { refType: "contribution" as const, debit: 0, credit: 100, at },
      { refType: "expense" as const, debit: 30, credit: 0, at },
    ];
    expect(reconciles(entries, 70)).toBe(true);
    expect(reconciles(entries, 75)).toBe(false);
  });

  it("handles floating point money without drift", () => {
    const entries = Array.from({ length: 10 }, () => ({
      refType: "contribution" as const,
      debit: 0,
      credit: 0.1,
      at,
    }));
    expect(computeBalance(entries)).toBe(1);
  });
});

describe("paynow", () => {
  const cfg = {
    integrationId: "1201",
    integrationKey: "3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977",
    resultUrl: "https://kinos.family/api/webhooks/paynow",
    returnUrl: "https://kinos.family/app/money",
  };

  it("builds an initiate body with an authentic hash", () => {
    const body = buildInitiateBody(cfg, {
      reference: "intent-123",
      amount: 41,
      email: "pay@kinos.family",
    });
    const hash = body.get("hash");
    expect(hash).toMatch(/^[0-9A-F]{128}$/);
    expect(body.get("amount")).toBe("41.00");
    expect(body.get("id")).toBe("1201");
  });

  it("verifies an authentic status callback and rejects tampering", () => {
    const fields: Record<string, string> = {
      reference: "intent-123",
      paynowreference: "PN-999",
      amount: "41.00",
      status: "Paid",
    };
    const hash = paynowHash(fields, cfg.integrationKey);
    const body = new URLSearchParams({ ...fields, hash }).toString();
    const verified = verifyStatusCallback(body, cfg.integrationKey);
    expect(verified).not.toBeNull();
    expect(verified!.status).toBe("Paid");

    const tampered = new URLSearchParams({
      ...fields,
      amount: "4100.00",
      hash,
    }).toString();
    expect(verifyStatusCallback(tampered, cfg.integrationKey)).toBeNull();
  });

  it("parses gateway responses", () => {
    const ok = parseInitiateResponse(
      "status=Ok&browserurl=https%3A%2F%2Fpay&pollurl=https%3A%2F%2Fpoll",
    );
    expect(ok.ok).toBe(true);
    expect(ok.redirectUrl).toBe("https://pay");

    const err = parseInitiateResponse("status=Error&error=Invalid+id");
    expect(err.ok).toBe(false);
    expect(err.error).toBe("Invalid id");
  });
});

describe("reconciliation state machine", () => {
  const intent = {
    id: "i1",
    status: "pending" as const,
    amount: 41,
    currency: "USD",
    potId: "pot-1",
  };

  it("settles exactly once on success", () => {
    const first = decideReconciliation(intent, "succeeded");
    expect(first).toEqual({ nextStatus: "succeeded", settle: true });

    const replay = decideReconciliation(
      { ...intent, status: "succeeded" },
      "succeeded",
    );
    expect(replay).toEqual({ nextStatus: null, settle: false });
  });

  it("never resurrects a terminal intent", () => {
    for (const terminal of ["succeeded", "failed", "cancelled"] as const) {
      const d = decideReconciliation({ ...intent, status: terminal }, "processing");
      expect(d.nextStatus).toBeNull();
      expect(d.settle).toBe(false);
    }
  });

  it("does not settle subscription intents (no pot)", () => {
    const d = decideReconciliation({ ...intent, potId: null }, "succeeded");
    expect(d.nextStatus).toBe("succeeded");
    expect(d.settle).toBe(false);
  });

  it("maps provider events to statuses", () => {
    expect(stripeEventToStatus("checkout.session.completed")).toBe("succeeded");
    expect(stripeEventToStatus("checkout.session.expired")).toBe("cancelled");
    expect(stripeEventToStatus("customer.created")).toBeNull();
    expect(paynowStatusToStatus("Paid")).toBe("succeeded");
    expect(paynowStatusToStatus("Cancelled")).toBe("cancelled");
    expect(paynowStatusToStatus("Sent")).toBe("processing");
  });
});
