import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProductsByIds } from "@/lib/db/catalog";
import { checkCoupon, recordCouponUsage } from "@/lib/db/coupons";
import { createPendingOrder } from "@/lib/db/orders";
import { getRegional } from "@/lib/settings";
import { computeTotals, priceLines, type CartLineInput } from "@/lib/pricing";
import { fromPaise } from "@/lib/money";
import { isPhone, requireString, ValidationError } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { createRazorpayOrder, razorpayLiveConfigured, isTestMode } from "@/lib/razorpay";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { safeServiceSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Checkout — the ONLY place order totals are fixed.
 * The browser supplies product ids + quantities + coupon; every price,
 * discount and tax is recomputed here from the database.
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "checkout", key: ip, limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to place your order." }, { status: 401 });

  let body: {
    lines?: CartLineInput[];
    couponCode?: string;
    customer?: { name?: string; email?: string; phone?: string; address?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const name = requireString(body.customer?.name, "Name", { max: 120 });
    const email = requireString(body.customer?.email ?? user.email, "Email", { max: 254 });
    const phoneRaw = body.customer?.phone ? String(body.customer.phone) : null;
    if (phoneRaw && !isPhone(phoneRaw)) throw new ValidationError("Enter a valid phone number.", "phone");
    const linesIn = Array.isArray(body.lines) ? body.lines.slice(0, 20) : [];
    if (linesIn.length === 0) throw new ValidationError("Your cart is empty.", "cart");

    // 1) price from DB only
    const products = await getProductsByIds(linesIn.map((l) => String(l.productId).slice(0, 40)));
    if (products.size !== new Set(linesIn.map((l) => String(l.productId))).size) {
      throw new ValidationError("A product in your cart no longer exists.", "cart");
    }
    const regional = await getRegional();
    const pricedLines = priceLines(
      linesIn.map((l) => ({
        productId: String(l.productId),
        quantity: Number(l.quantity),
        addons: Array.isArray(l.addons) ? l.addons.map(String) : [],
        options: l.options && typeof l.options === "object" ? (l.options as Record<string, unknown>) : undefined,
      })),
      products,
      regional.taxRate,
    );

    // 2) coupon, fully server-validated
    const listedProducts = pricedLines.map((l) => products.get(l.productId)!);
    const { coupon, result } = await checkCoupon({
      code: body.couponCode ?? "",
      userId: user.id,
      subtotalPaise: pricedLines.reduce((s, l) => s + l.lineSubtotalPaise, 0),
      cartProductIds: pricedLines.map((l) => l.productId),
      cartCategoryIds: listedProducts.map((p) => p.category_id).filter((x): x is string => Boolean(x)),
    });
    if (body.couponCode && !result.valid) {
      return NextResponse.json({ error: result.reason ?? "Coupon not valid." }, { status: 400 });
    }

    // 3) totals
    const totals = computeTotals(pricedLines, result);
    if (totals.grandPaise <= 0) throw new ValidationError("Order total must be greater than zero.", "cart");

    // 4) create order
    const order = await createPendingOrder({
      userId: user.id,
      email,
      phone: phoneRaw,
      customer: { name, address: body.customer?.address ?? null },
      totals,
      couponCode: result.valid ? result.code : null,
    });
    if (result.valid && coupon) {
      await recordCouponUsage({ couponId: coupon.id, userId: user.id, orderId: order.id, discountPaise: totals.discountPaise });
    }
    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      action: "order.created",
      entity: "order",
      entityId: order.id,
      meta: { orderNumber: order.orderNumber, grand: fromPaise(totals.grandPaise) },
    });

    // 5) payment
    if (razorpayLiveConfigured()) {
      const rz = await createRazorpayOrder({
        amountPaise: totals.grandPaise,
        receipt: order.orderNumber,
        notes: { order_id: order.id },
      });
      const sb = safeServiceSupabase();
      if (sb) {
        await sb.from("payments").insert({
          order_id: order.id,
          provider: "razorpay",
          provider_order_id: rz.id,
          amount: fromPaise(totals.grandPaise),
          status: "created",
        });
      }
      return NextResponse.json({
        ok: true,
        testMode: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpay: {
          keyId: env.razorpayKeyId,
          orderId: rz.id,
          amountPaise: totals.grandPaise,
        },
        totals: {
          subtotal: fromPaise(totals.subtotalPaise),
          discount: fromPaise(totals.discountPaise),
          tax: fromPaise(totals.taxPaise),
          grand: fromPaise(totals.grandPaise),
        },
      });
    }

    // TEST MODE: order stays pending_payment; an admin records payment manually.
    return NextResponse.json({
      ok: true,
      testMode: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      note: "Payments are in test mode. Your order was placed as PENDING PAYMENT; it will be activated after payment is confirmed.",
      totals: {
        subtotal: fromPaise(totals.subtotalPaise),
        discount: fromPaise(totals.discountPaise),
        tax: fromPaise(totals.taxPaise),
        grand: fromPaise(totals.grandPaise),
      },
      paymentsTestMode: isTestMode(),
    });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("checkout error", e);
    return NextResponse.json({ error: "Could not place the order. Please try again." }, { status: 500 });
  }
}
