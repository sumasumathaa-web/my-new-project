import { describe, expect, it } from "vitest";
import { computeTotals, priceLines, unitPricePaise } from "@/lib/pricing";
import type { Product } from "@/lib/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Golden Reels Invite (DEMO)",
    slug: "golden-reels-invite",
    kind: "video",
    category_id: null,
    tags: [],
    description: null,
    long_description: null,
    thumbnail_path: null,
    preview_video_path: null,
    demo_url: null,
    price_original: 1499,
    price_selling: 999,
    price_sale: null,
    customization_fee: 0,
    extra_revision_fee: 0,
    customization_schema: [],
    customization_enabled: false,
    tax_rate: null,
    delivery_estimate: null,
    revision_policy: null,
    license_terms: null,
    status: "published",
    is_featured: false,
    sort_order: 0,
    service_addons: [],
    related_ids: [],
    is_demo: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as unknown as Product;
}

describe("unitPricePaise", () => {
  it("converts rupees to integer paise without float drift", () => {
    expect(unitPricePaise(product({ price_selling: 999.99 }))).toBe(99999);
    expect(unitPricePaise(product({ price_selling: 0.1 }))).toBe(10);
    expect(unitPricePaise(product({ price_selling: 1499 }))).toBe(149900);
  });

  it("uses sale price only when valid (0 < sale < selling)", () => {
    expect(unitPricePaise(product({ price_selling: 999, price_sale: 799 }))).toBe(79900);
    expect(unitPricePaise(product({ price_selling: 999, price_sale: 999 }))).toBe(99900); // equal: not a sale
    expect(unitPricePaise(product({ price_selling: 999, price_sale: 1200 }))).toBe(99900); // higher: ignored
    expect(unitPricePaise(product({ price_selling: 999, price_sale: 0 }))).toBe(99900);
    expect(unitPricePaise(product({ price_selling: 999, price_sale: null }))).toBe(99900);
  });
});

describe("priceLines (server-authoritative)", () => {
  const products = new Map<string, Product>([
    [
      "p1",
      product({
        service_addons: [{ name: "Priority delivery", price: 299 }],
        customization_enabled: true,
        customization_fee: 150,
      }),
    ],
  ]);

  it("computes line totals from DB prices — never trusts client amounts", () => {
    const lines = priceLines([{ productId: "p1", quantity: 2 }], products, 0);
    expect(lines).toHaveLength(1);
    expect(lines[0].lineSubtotalPaise).toBe(99900 * 2);
  });

  it("adds only configured add-ons and rejects unknown ones", () => {
    const lines = priceLines([{ productId: "p1", quantity: 1, addons: ["Priority delivery"] }], products, 0);
    expect(lines[0].addonsPaise).toBe(29900);
    expect(() => priceLines([{ productId: "p1", quantity: 1, addons: ["Free diamonds"] }], products, 0)).toThrow(/add-on/i);
  });

  it("charges the customization fee only when options are supplied and schema is enabled", () => {
    const without = priceLines([{ productId: "p1", quantity: 1 }], products, 0);
    expect(without[0].customizationFeePaise).toBe(0);
    const withOpt = priceLines([{ productId: "p1", quantity: 1, options: { partner_a: "Asha" } }], products, 0);
    expect(withOpt[0].customizationFeePaise).toBe(15000);
  });

  it("rejects unpublished products and bad quantities", () => {
    const map = new Map([["p2", product({ id: "p2", status: "archived" })]]);
    expect(() => priceLines([{ productId: "p2", quantity: 1 }], map, 0)).toThrow(/not currently available/i);
    expect(() => priceLines([{ productId: "p1", quantity: 0 }], products, 0)).toThrow(/Invalid quantity/);
    expect(() => priceLines([{ productId: "p1", quantity: 42 }], products, 0)).toThrow(/Invalid quantity/);
    expect(() => priceLines([{ productId: "ghost", quantity: 1 }], products, 0)).toThrow(/no longer exists/);
  });
});

describe("computeTotals (integer paise, tax after discount)", () => {
  it("sums lines, applies proportional GST on the discounted base", () => {
    const products = new Map([["p1", product({ tax_rate: 18 })]]);
    const lines = priceLines([{ productId: "p1", quantity: 2 }], products, 18);
    const totals = computeTotals(lines, { code: null, valid: false, reason: null, discountPaise: 0 });
    expect(totals.subtotalPaise).toBe(199800);
    expect(totals.discountPaise).toBe(0);
    expect(totals.taxPaise).toBe(Math.round(199800 * 0.18));
    expect(totals.grandPaise).toBe(totals.subtotalPaise + totals.taxPaise);
  });

  it("applies discount before tax and clamps to subtotal", () => {
    const products = new Map([["p1", product({})]]);
    const lines = priceLines([{ productId: "p1", quantity: 1 }], products, 0);
    const totals = computeTotals(lines, { code: "X", valid: true, reason: null, discountPaise: 99999999 });
    expect(totals.discountPaise).toBe(99900);
    expect(totals.taxablePaise).toBe(0);
    expect(totals.grandPaise).toBe(0);
  });

  it("never produces a negative grand total", () => {
    const products = new Map([["p1", product({})]]);
    const lines = priceLines([{ productId: "p1", quantity: 1 }], products, 0);
    const totals = computeTotals(lines, { code: "X", valid: true, reason: null, discountPaise: 99990 });
    expect(totals.grandPaise).toBeGreaterThanOrEqual(0);
  });
});
