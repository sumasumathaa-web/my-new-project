import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { markOrderPaid } from "@/lib/db/orders";
import { toPaise } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { sendOrderPaidEmail } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver.
 * - Signature-verified with RAZORPAY_WEBHOOK_SECRET.
 * - Idempotent via payment_events unique event id (duplicates → 200 "already processed").
 * - Never trusts unverified payloads.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    await logAudit({ action: "webhook.signature_failed", entity: "payment", meta: {} });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; amount?: number; method?: string } };
      refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id") ?? `${payload.event}:${cryptoRandom()}`;
  const sb = safeServiceSupabase();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  // Idempotency gate
  const { error: insertErr } = await sb.from("payment_events").insert({
    provider: "razorpay",
    event_id: eventId,
    event_type: payload.event ?? "unknown",
    payload,
  });
  if (insertErr) {
    // Unique violation => already processed
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    switch (payload.event) {
      case "payment.captured": {
        const entity = payload.payload?.payment?.entity;
        if (!entity?.order_id || !entity.id) break;
        const { data: payment } = await sb
          .from("payments")
          .select("order_id")
          .eq("provider_order_id", entity.order_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (payment?.order_id) {
          const { alreadyPaid } = await markOrderPaid({
            orderId: payment.order_id,
            provider: "razorpay",
            providerOrderId: entity.order_id,
            providerPaymentId: entity.id,
            amountPaise: Number(entity.amount ?? 0) || toPaise(0),
            method: entity.method ?? "razorpay-webhook",
            signatureVerified: true,
            raw: entity,
          });
          if (!alreadyPaid) await sendOrderPaidEmail(payment.order_id);
        }
        break;
      }
      case "payment.failed": {
        const entity = payload.payload?.payment?.entity;
        if (entity?.order_id) {
          const { data: payment } = await sb
            .from("payments")
            .select("id, order_id")
            .eq("provider_order_id", entity.order_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (payment) {
            await sb.from("payments").update({ status: "failed", raw: entity }).eq("id", payment.id);
            await sb.from("orders").update({ payment_status: "failed" }).eq("id", payment.order_id);
          }
        }
        break;
      }
      case "refund.processed": {
        const refund = payload.payload?.refund?.entity;
        if (refund?.payment_id) {
          const { data: payment } = await sb
            .from("payments")
            .select("id, order_id, amount")
            .eq("provider_payment_id", refund.payment_id)
            .maybeSingle();
          if (payment) {
            await sb.from("refunds").insert({
              payment_id: payment.id,
              amount: (refund.amount ?? 0) / 100,
              provider_refund_id: refund.id ?? null,
              reason: "Razorpay refund webhook",
              status: "processed",
            });
            const full = Number(refund.amount ?? 0) >= Number(payment.amount) * 100;
            await sb
              .from("payments")
              .update({ status: full ? "refunded" : "partially_refunded" })
              .eq("id", payment.id);
            if (full) {
              await sb.from("orders").update({ payment_status: "refunded", status: "refunded" }).eq("id", payment.order_id);
            } else {
              await sb.from("orders").update({ payment_status: "partially_refunded" }).eq("id", payment.order_id);
            }
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("webhook handling error", e);
    // Return 500 so Razorpay retries; idempotency keeps retries safe.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
