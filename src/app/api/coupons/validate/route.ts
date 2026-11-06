import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProductsByIds } from "@/lib/db/catalog";
import { checkCoupon } from "@/lib/db/coupons";
import { getRegional } from "@/lib/settings";
import { computeTotals, priceLines, type CartLineInput } from "@/lib/pricing";
import { fromPaise } from "@/lib/money";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Server-side coupon preview: the authoritative check happens again at checkout. */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "coupon", key: ip, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  let body: { code?: string; lines?: CartLineInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const code = (body.code ?? "").trim();
  if (!code || code.length > 40) return NextResponse.json({ error: "Enter a valid coupon code." }, { status: 400 });
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, 20) : [];

  const user = await getSessionUser();
  const products = await getProductsByIds(lines.map((l) => String(l.productId)));
  let priced;
  try {
    const regional = await getRegional();
    priced = priceLines(lines, products, regional.taxRate);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid cart." }, { status: 400 });
  }
  const subtotal = priced.reduce((s, l) => s + l.lineSubtotalPaise, 0);
  const listedProducts = priced.map((l) => products.get(l.productId)).filter(Boolean);
  const { result } = await checkCoupon({
    code,
    userId: user?.id ?? null,
    subtotalPaise: subtotal,
    cartProductIds: priced.map((l) => l.productId),
    cartCategoryIds: listedProducts.map((p) => p!.category_id).filter((x): x is string => Boolean(x)),
  });

  const totals = computeTotals(priced, result);
  if (!result.valid) {
    return NextResponse.json({ ok: false, reason: result.reason, subtotal: fromPaise(subtotal) }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    discount: fromPaise(totals.discountPaise),
    subtotal: fromPaise(totals.subtotalPaise),
    tax: fromPaise(totals.taxPaise),
    grand: fromPaise(totals.grandPaise),
  });
}
