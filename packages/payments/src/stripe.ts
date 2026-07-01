import Stripe from "stripe";

/**
 * Stripe adapter — global card payments for Money Pot contributions and
 * plan subscriptions. Server-only; webhook events are verified by
 * signature and reconciled idempotently (see reconcile.ts).
 */

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface ContributionCheckoutParams {
  paymentIntentId: string; // our internal payment_intent row id
  potName: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export async function createContributionCheckout(
  params: ContributionCheckoutParams,
): Promise<{ url: string; externalId: string }> {
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: params.paymentIntentId,
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: { name: `Contribution — ${params.potName}` },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { kinos_payment_intent: params.paymentIntentId },
  });
  if (!session.url) throw new Error("checkout session has no URL");
  return { url: session.url, externalId: session.id };
}

export interface SubscriptionCheckoutParams {
  workspaceId: string;
  planId: string;
  priceCents: number;
  planName: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export async function createSubscriptionCheckout(
  params: SubscriptionCheckoutParams,
): Promise<{ url: string; externalId: string }> {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          product_data: { name: `KinOS ${params.planName}` },
          unit_amount: params.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { kinos_workspace: params.workspaceId, kinos_plan: params.planId },
  });
  if (!session.url) throw new Error("checkout session has no URL");
  return { url: session.url, externalId: session.id };
}

/** Verify and parse a webhook payload; throws on a bad signature. */
export function verifyStripeWebhook(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
