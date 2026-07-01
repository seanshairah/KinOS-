import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Paynow (Zimbabwe) adapter — EcoCash / OneMoney / cards via the Paynow
 * gateway. Implements the documented "Initiate Transaction" wire format:
 * form-encoded fields + SHA512 hash of concatenated values + integration
 * key. The React widget (`paynow-react`) drives the client; this module is
 * the server half it talks to.
 */

export interface PaynowConfig {
  integrationId: string;
  integrationKey: string;
  resultUrl: string;
  returnUrl: string;
}

export interface PaynowInitiateRequest {
  reference: string; // our payment_intent id
  amount: number;
  email: string;
  additionalInfo?: string;
}

/** SHA512 over concatenated values (order preserved) + integration key, uppercased. */
export function paynowHash(
  values: Record<string, string>,
  integrationKey: string,
): string {
  const concatenated = Object.values(values).join("") + integrationKey;
  return createHash("sha512").update(concatenated, "utf8").digest("hex").toUpperCase();
}

export function buildInitiateBody(
  cfg: PaynowConfig,
  req: PaynowInitiateRequest,
): URLSearchParams {
  const fields: Record<string, string> = {
    id: cfg.integrationId,
    reference: req.reference,
    amount: req.amount.toFixed(2),
    additionalinfo: req.additionalInfo ?? "",
    returnurl: cfg.returnUrl,
    resulturl: cfg.resultUrl,
    authemail: req.email,
    status: "Message",
  };
  const hash = paynowHash(fields, cfg.integrationKey);
  return new URLSearchParams({ ...fields, hash });
}

const initiateResponseSchema = z.object({
  status: z.string(),
  browserurl: z.string().optional(),
  pollurl: z.string().optional(),
  error: z.string().optional(),
});

export interface PaynowInitiateResult {
  ok: boolean;
  redirectUrl?: string;
  pollUrl?: string;
  error?: string;
}

export function parseInitiateResponse(body: string): PaynowInitiateResult {
  const params = Object.fromEntries(new URLSearchParams(body));
  const parsed = initiateResponseSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "unexpected gateway response" };
  if (parsed.data.status.toLowerCase() !== "ok") {
    return { ok: false, error: parsed.data.error ?? "gateway declined" };
  }
  return {
    ok: true,
    redirectUrl: parsed.data.browserurl,
    pollUrl: parsed.data.pollurl,
  };
}

export async function initiatePaynowPayment(
  cfg: PaynowConfig,
  req: PaynowInitiateRequest,
): Promise<PaynowInitiateResult> {
  const res = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: buildInitiateBody(cfg, req).toString(),
  });
  return parseInitiateResponse(await res.text());
}

/**
 * Verify a Paynow status callback (result URL POST). Returns the parsed
 * status when the hash is authentic, null otherwise.
 */
export interface PaynowStatus {
  reference: string;
  paynowReference: string;
  amount: number;
  status: string; // "Paid" | "Awaiting Delivery" | "Cancelled" | ...
}

export function verifyStatusCallback(
  body: string,
  integrationKey: string,
): PaynowStatus | null {
  const params = new URLSearchParams(body);
  const received = params.get("hash");
  if (!received) return null;

  const values: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.toLowerCase() !== "hash") values[key] = value;
  }
  const expected = paynowHash(values, integrationKey);
  if (expected !== received.toUpperCase()) return null;

  return {
    reference: params.get("reference") ?? "",
    paynowReference: params.get("paynowreference") ?? "",
    amount: Number(params.get("amount") ?? 0),
    status: params.get("status") ?? "",
  };
}

export function isPaid(status: PaynowStatus): boolean {
  return status.status.toLowerCase() === "paid";
}
