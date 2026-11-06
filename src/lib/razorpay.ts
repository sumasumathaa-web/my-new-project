/**
 * Razorpay integration — server only.
 *
 * - Payment orders are created server-side.
 * - Checkout completions are only accepted after HMAC-SHA256 signature
 *   verification against the key secret.
 * - Webhook payloads are verified against the webhook secret.
 * - No card/CVV data ever touches this application (Razorpay hosts the
 *   payment page); secrets stay in server environment variables.
 */
import crypto from "crypto";
import { env, paymentsEnabled } from "@/lib/env";

export function razorpayLiveConfigured(): boolean {
  return paymentsEnabled();
}

export function isTestMode(): boolean {
  return env.paymentsTestMode;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verifies Razorpay checkout response signature (order_id|payment_id). */
export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string; // injectable for tests
}): boolean {
  const secret = params.secret ?? env.razorpayKeySecret;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return safeEqual(expected, params.signature);
}

/** Verifies a webhook delivery signature (raw request body). */
export function verifyWebhookSignature(rawBody: string, signature: string, secretOverride?: string): boolean {
  const secret = secretOverride ?? env.razorpayWebhookSecret;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Creates a Razorpay order server-side. Uses the official SDK lazily so the
 * build works without credentials. Amounts are integer paise.
 */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const [{ default: Razorpay }] = await Promise.all([import("razorpay")]);
  const instance = new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
  const order = await instance.orders.create({
    amount: params.amountPaise,
    currency: "INR",
    receipt: params.receipt.slice(0, 40),
    notes: params.notes,
  });
  return { id: String(order.id), amount: Number(order.amount), currency: String(order.currency) };
}

/** Refund via Razorpay API (server). */
export async function refundRazorpayPayment(paymentId: string, amountPaise?: number): Promise<{ id: string }> {
  const { default: Razorpay } = await import("razorpay");
  const instance = new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  const refund = await instance.payments.refund(paymentId, amountPaise ? { amount: amountPaise } : {});
  return { id: String(refund.id) };
}
