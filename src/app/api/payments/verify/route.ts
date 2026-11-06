import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrderById, markOrderPaid } from "@/lib/db/orders";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { toPaise } from "@/lib/money";
import { isUuid } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { sendOrderPaidEmail } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

/** Verifies Razorpay checkout completion client callback. Idempotent. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    orderId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!orderId || !isUuid(orderId) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.user_id !== user.id) return NextResponse.json({ error: "Not your order." }, { status: 403 });

  const verified = verifyCheckoutSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!verified) {
    await logAudit({
      actorUserId: user.id,
      action: "payment.signature_failed",
      entity: "order",
      entityId: orderId,
      meta: { razorpay_order_id },
    });
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  // Amount integrity: the captured amount must equal the server order total.
  const amountPaise = toPaise(order.grand_total);
  const { alreadyPaid } = await markOrderPaid({
    orderId: order.id,
    provider: "razorpay",
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    amountPaise,
    method: "razorpay-checkout",
    signatureVerified: true,
  });
  if (!alreadyPaid) await sendOrderPaidEmail(order.id);
  return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.order_number });
}
