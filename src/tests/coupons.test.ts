import { describe, expect, it } from "vitest";
import { validateCoupon, type CouponContext } from "@/lib/pricing";
import type { Coupon } from "@/lib/types";

const ctxBase: CouponContext = {
  subtotalPaise: 100000, // ₹1,000.00
  customerPaidOrders: 0,
  couponTotalUses: 0,
  couponUserUses: 0,
  cartProductIds: ["p1"],
  cartCategoryIds: ["c1"],
};

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "cp1",
    code: "WELCOME10",
    kind: "percent",
    value: 10,
    min_purchase: 0,
    max_discount: null,
    starts_at: null,
    expires_at: null,
    usage_limit: null,
    per_user_limit: 1,
    first_order_only: false,
    applies_to: "all",
    product_ids: [],
    category_ids: [],
    is_active: true,
    description: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as unknown as Coupon;
}

describe("validateCoupon", () => {
  it("applies a percent coupon and returns integer paise", () => {
    const result = validateCoupon(coupon(), "welcome10", ctxBase);
    expect(result.valid).toBe(true);
    expect(result.discountPaise).toBe(10000);
    expect(result.code).toBe("WELCOME10");
  });

  it("honours max_discount clamp for percent coupons", () => {
    const result = validateCoupon(coupon({ max_discount: 50 }), "WELCOME10", ctxBase);
    expect(result.valid).toBe(true);
    expect(result.discountPaise).toBe(5000); // ₹50 cap
  });

  it("fixed coupon never exceeds the subtotal", () => {
    const result = validateCoupon(coupon({ kind: "fixed", value: 5000 }), "WELCOME10", ctxBase);
    expect(result.valid).toBe(true);
    expect(result.discountPaise).toBe(100000); // clamped to the whole cart
  });

  it("rejects inactive, expired, future and over-limit coupons", () => {
    expect(validateCoupon(coupon({ is_active: false }), "WELCOME10", ctxBase).valid).toBe(false);
    expect(
      validateCoupon(coupon({ expires_at: new Date(Date.now() - 60_000).toISOString() }), "WELCOME10", ctxBase).valid
    ).toBe(false);
    expect(
      validateCoupon(coupon({ starts_at: new Date(Date.now() + 60_000).toISOString() }), "WELCOME10", ctxBase).reason
    ).toMatch(/not started/);
    expect(validateCoupon(coupon({ usage_limit: 2 }), "WELCOME10", { ...ctxBase, couponTotalUses: 2 }).valid).toBe(false);
  });

  it("enforces minimum purchase and per-user limits", () => {
    expect(validateCoupon(coupon({ min_purchase: 2000 }), "WELCOME10", ctxBase).valid).toBe(false);
    expect(validateCoupon(coupon({ per_user_limit: 1 }), "WELCOME10", { ...ctxBase, couponUserUses: 1 }).valid).toBe(false);
  });

  it("enforces first-order-only for returning customers", () => {
    const result = validateCoupon(coupon({ first_order_only: true }), "WELCOME10", {
      ...ctxBase,
      customerPaidOrders: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/first order/i);
  });

  it("enforces product and category scope", () => {
    const scoped = validateCoupon(coupon({ applies_to: "product", product_ids: ["other"] }), "WELCOME10", ctxBase);
    expect(scoped.valid).toBe(false);
    const hit = validateCoupon(coupon({ applies_to: "category", category_ids: ["c1"] }), "WELCOME10", ctxBase);
    expect(hit.valid).toBe(true);
  });

  it("rejects unknown/mismatched codes and empty carts", () => {
    expect(validateCoupon(coupon(), "NOPE", ctxBase).valid).toBe(false);
    expect(validateCoupon(coupon(), "WELCOME10", { ...ctxBase, subtotalPaise: 0 }).valid).toBe(false);
    expect(validateCoupon(null, "WELCOME10", ctxBase).valid).toBe(false);
  });
});
