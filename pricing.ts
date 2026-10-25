/**
 * SERVER-AUTHORITATIVE pricing engine.
 *
 * Everything the browser sends (prices, discounts, totals) is untrusted:
 * this module recomputes line prices from database rows, validates coupons
 * against all configured rules, and derives taxes + grand total in integer
 * paise. Pure functions — unit tested in src/tests/pricing.test.ts.
 */
import { toPaise } from "@/lib/money";
import type { Coupon, Product } from "@/lib/types";

export interface CartLineInput {
  productId: string;
  quantity: number;
  addons?: string[]; // names of selected service addons
  options?: Record<string, unknown>;
}

export interface PricedLine {
  productId: string;
  name: string;
  slug: string;
  kind: string;
  quantity: number;
  unitPaise: number; // effective product price
  addonsPaise: number; // per-unit addons total
  customizationFeePaise: number; // per-unit customization fee when options supplied
  lineSubtotalPaise: number;
  taxRate: number; // percent
}

export interface CouponResult {
  code: string | null;
  valid: boolean;
  reason: string | null;
  discountPaise: number;
}

export interface Totals {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  taxPaise: number;
  grandPaise: number;
  coupon: CouponResult;
}

/** Effective per-unit price in paise: sale (if sane) else selling price. */
export function unitPricePaise(product: Product): number {
  const selling = toPaise(product.price_selling);
  const sale = toPaise(product.price_sale);
  if (sale > 0 && sale < selling) return sale;
  return selling;
}

export function effectiveTaxRate(product: Product, globalRate: number): number {
  const r = product.tax_rate;
  if (r === null || r === undefined) return clampRate(globalRate);
  return clampRate(Number(r));
}

function clampRate(r: number): number {
  if (!Number.isFinite(r) || r < 0) return 0;
  return Math.min(r, 100);
}

/**
 * Price cart lines from authoritative DB products.
 * Throws Error with a user-facing message when a line is invalid.
 */
export function priceLines(
  inputs: CartLineInput[],
  productsById: Map<string, Product>,
  globalTaxRate: number,
): PricedLine[] {
  const lines: PricedLine[] = [];
  for (const input of inputs) {
    const product = productsById.get(input.productId);
    if (!product) throw new Error("A product in your cart no longer exists.");
    if (product.status !== "published") {
      throw new Error(`"${product.name}" is not currently available.`);
    }
    const quantity = Math.floor(Number(input.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) {
      throw new Error(`Invalid quantity for "${product.name}".`);
    }
    const unit = unitPricePaise(product);

    // Add-ons: only names configured on the product are billable.
    const selectedAddons = Array.isArray(input.addons) ? input.addons : [];
    const configured = Array.isArray(product.service_addons) ? product.service_addons : [];
    let addons = 0;
    for (const name of selectedAddons) {
      const addon = configured.find((a) => a.name === name);
      if (!addon) throw new Error(`Invalid add-on "${name}" for "${product.name}".`);
      addons += toPaise(addon.price);
    }

    // Customization fee applies when customer supplies customization payload.
    const hasOptions = input.options && Object.keys(input.options).length > 0;
    const fee = product.customization_enabled && hasOptions ? toPaise(product.customization_fee) : 0;

    const lineSubtotal = (unit + addons + fee) * quantity;
    lines.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      kind: product.kind,
      quantity,
      unitPaise: unit,
      addonsPaise: addons,
      customizationFeePaise: fee,
      lineSubtotalPaise: lineSubtotal,
      taxRate: effectiveTaxRate(product, globalTaxRate),
    });
  }
  return lines;
}

export interface CouponContext {
  subtotalPaise: number;
  /** number of previously PAID orders by this customer */
  customerPaidOrders: number;
  /** how many orders already consumed this coupon */
  couponTotalUses: number;
  /** how many times THIS customer used the coupon */
  couponUserUses: number;
  /** product ids in cart */
  cartProductIds: string[];
  /** category ids represented in cart */
  cartCategoryIds: string[];
}

/**
 * Validates a coupon against every rule. Pure & deterministic given context.
 */
export function validateCoupon(
  coupon: Coupon | null | undefined,
  code: string | null | undefined,
  ctx: CouponContext,
): CouponResult {
  const empty: CouponResult = { code: null, valid: false, reason: null, discountPaise: 0 };
  const wanted = (code ?? "").trim().toUpperCase();
  if (!wanted) return empty;
  if (!coupon || coupon.code.toUpperCase() !== wanted) {
    return { ...empty, code: wanted, reason: "This coupon code is not valid." };
  }
  if (!coupon.is_active) return { ...empty, code: wanted, reason: "This coupon is no longer active." };

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { ...empty, code: wanted, reason: "This offer has not started yet." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { ...empty, code: wanted, reason: "This coupon has expired." };
  }
  if (ctx.subtotalPaise <= 0) return { ...empty, code: wanted, reason: "Your cart is empty." };

  const minPaise = toPaise(coupon.min_purchase);
  if (ctx.subtotalPaise < minPaise) {
    return { ...empty, code: wanted, reason: "Your order does not meet the minimum purchase for this coupon." };
  }
  if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && ctx.couponTotalUses >= coupon.usage_limit) {
    return { ...empty, code: wanted, reason: "This coupon has reached its usage limit." };
  }
  if (ctx.couponUserUses >= Math.max(1, Number(coupon.per_user_limit ?? 1))) {
    return { ...empty, code: wanted, reason: "You have already used this coupon." };
  }
  if (coupon.first_order_only && ctx.customerPaidOrders > 0) {
    return { ...empty, code: wanted, reason: "This coupon is valid on your first order only." };
  }

  // Scope: eligible share of the subtotal.
  let eligiblePaise = ctx.subtotalPaise;
  if (coupon.applies_to !== "all") {
    const scopeIds = new Set(coupon.applies_to === "product" ? coupon.product_ids : coupon.category_ids);
    const inScope = coupon.applies_to === "product" ? ctx.cartProductIds : ctx.cartCategoryIds;
    const hits = inScope.filter((id) => scopeIds.has(id));
    if (hits.length === 0) {
      return { ...empty, code: wanted, reason: "This coupon does not apply to items in your cart." };
    }
  }

  let discount: number;
  if (coupon.kind === "percent") {
    const pct = Math.min(100, Math.max(0, Number(coupon.value)));
    discount = Math.round((eligiblePaise * pct) / 100);
  } else {
    discount = toPaise(coupon.value);
  }
  if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
    discount = Math.min(discount, toPaise(coupon.max_discount));
  }
  discount = Math.max(0, Math.min(discount, ctx.subtotalPaise));
  if (discount <= 0) return { ...empty, code: wanted, reason: "This coupon gives no discount on your cart." };

  return { code: wanted, valid: true, reason: null, discountPaise: discount };
}

/** Proportional, integer-safe tax computation after discount. */
export function computeTotals(
  lines: PricedLine[],
  coupon: CouponResult,
): Totals {
  const subtotal = lines.reduce((s, l) => s + l.lineSubtotalPaise, 0);
  const discount = coupon.valid ? Math.min(coupon.discountPaise, subtotal) : 0;
  const taxable = subtotal - discount;

  let tax = 0;
  if (subtotal > 0 && taxable > 0) {
    for (const line of lines) {
      // Share of the taxable base attributable to this line.
      const base = Math.round((taxable * line.lineSubtotalPaise) / subtotal);
      tax += Math.round((base * line.taxRate) / 100);
    }
  }
  const grand = taxable + tax;
  return {
    lines,
    subtotalPaise: subtotal,
    discountPaise: discount,
    taxablePaise: taxable,
    taxPaise: tax,
    grandPaise: grand,
    coupon,
  };
}
