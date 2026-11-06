/** Coupon server-side validation + usage tracking. */
import { safeServiceSupabase } from "@/lib/supabase/admin";
import type { Coupon } from "@/lib/types";
import { validateCoupon, type CouponContext } from "@/lib/pricing";

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("coupons").select("*").eq("code", code.trim().toUpperCase()).maybeSingle();
  return (data as Coupon | null) ?? null;
}

export async function buildCouponContext(opts: {
  userId: string | null;
  couponId: string | null;
  subtotalPaise: number;
  cartProductIds: string[];
  cartCategoryIds: string[];
}): Promise<CouponContext> {
  const sb = safeServiceSupabase();
  const base: CouponContext = {
    subtotalPaise: opts.subtotalPaise,
    customerPaidOrders: 0,
    couponTotalUses: 0,
    couponUserUses: 0,
    cartProductIds: opts.cartProductIds,
    cartCategoryIds: opts.cartCategoryIds,
  };
  if (!sb) return base;

  const queries: Promise<void>[] = [];
  if (opts.userId) {
    queries.push(
      (async () => {
        const { count } = await sb
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", opts.userId as string)
          .eq("payment_status", "paid");
        base.customerPaidOrders = count ?? 0;
      })(),
    );
  }
  if (opts.couponId) {
    queries.push(
      (async () => {
        const { count } = await sb
          .from("coupon_usages")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", opts.couponId as string);
        base.couponTotalUses = count ?? 0;
      })(),
    );
    if (opts.userId) {
      queries.push(
        (async () => {
          const { count } = await sb
            .from("coupon_usages")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", opts.couponId as string)
            .eq("user_id", opts.userId as string);
          base.couponUserUses = count ?? 0;
        })(),
      );
    }
  }
  await Promise.all(queries);
  return base;
}

/** Full server-side coupon validation for a cart subtotal. */
export async function checkCoupon(opts: {
  code: string;
  userId: string | null;
  subtotalPaise: number;
  cartProductIds: string[];
  cartCategoryIds: string[];
}) {
  const coupon = await getCouponByCode(opts.code);
  const ctx = await buildCouponContext({
    userId: opts.userId,
    couponId: coupon?.id ?? null,
    subtotalPaise: opts.subtotalPaise,
    cartProductIds: opts.cartProductIds,
    cartCategoryIds: opts.cartCategoryIds,
  });
  const result = validateCoupon(coupon, opts.code, ctx);
  return { coupon, result };
}

/** Record usage once the order exists (abandoned checkouts free usage on cancel). */
export async function recordCouponUsage(params: {
  couponId: string;
  userId: string | null;
  orderId: string;
  discountPaise: number;
}): Promise<void> {
  const sb = safeServiceSupabase();
  if (!sb) return;
  await sb.from("coupon_usages").upsert(
    {
      coupon_id: params.couponId,
      user_id: params.userId,
      order_id: params.orderId,
      discount_amount: params.discountPaise / 100,
    },
    { onConflict: "coupon_id,order_id" },
  );
}

/** Admin: usage report rows. */
export async function couponUsageReport(): Promise<
  { id: string; code: string; uses: number; totalDiscount: number; is_active: boolean; kind: string; value: number }[]
> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data: coupons } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
  const { data: usages } = await sb.from("coupon_usages").select("coupon_id, discount_amount");
  const byCoupon = new Map<string, { uses: number; total: number }>();
  for (const u of usages ?? []) {
    const cur = byCoupon.get(u.coupon_id) ?? { uses: 0, total: 0 };
    cur.uses += 1;
    cur.total += Number(u.discount_amount);
    byCoupon.set(u.coupon_id, cur);
  }
  return ((coupons ?? []) as Coupon[]).map((c) => ({
    id: c.id,
    code: c.code,
    uses: byCoupon.get(c.id)?.uses ?? 0,
    totalDiscount: byCoupon.get(c.id)?.total ?? 0,
    is_active: c.is_active,
    kind: c.kind,
    value: c.value,
  }));
}
