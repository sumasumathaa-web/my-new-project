/**
 * Integration tests — real Postgres (embedded) + the application's data layer.
 *
 * These exercise the production code paths (src/lib/db/*) against the same SQL
 * migrations and seed used by Supabase. They run on a temporary database
 * directory so they never touch your development data.
 */
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wedding-test-db-"));
process.env.LOCAL_DB_DIR = DATA_DIR;
process.env.LOCAL_DB = "1";
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

type Mods = {
  catalog: typeof import("@/lib/db/catalog");
  orders: typeof import("@/lib/db/orders");
  coupons: typeof import("@/lib/db/coupons");
  customizations: typeof import("@/lib/db/customizations");
  admin: typeof import("@/lib/supabase/admin");
};

let m: Mods;
let sql: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";
const USER_D = "44444444-4444-4444-8444-444444444444";

beforeAll(async () => {
  m = {
    catalog: await import("@/lib/db/catalog"),
    orders: await import("@/lib/db/orders"),
    coupons: await import("@/lib/db/coupons"),
    customizations: await import("@/lib/db/customizations"),
    admin: await import("@/lib/supabase/admin"),
  };
  const { getLocalState } = await import("@/lib/local/registry");
  const state = await getLocalState();
  sql = async (query, params) => (await state.db.query<Record<string, unknown>>(query, params)).rows;
  // Fixture users (the app's tables reference auth.users)
  for (const [id, email] of [
    [USER_A, "buyer-a@example.test"],
    [USER_B, "buyer-b@example.test"],
    [USER_C, "couple-c@example.test"],
    [USER_D, "couple-d@example.test"],
  ] as const) {
    await sql("insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3) on conflict (id) do nothing", [
      id,
      email,
      JSON.stringify({ full_name: email }),
    ]);
  }
}, 240_000);

describe("seeded catalogue", () => {
  it("loads demo products, categories, themes from the migrations+seed", async () => {
    const result = await m.catalog.listProducts({});
    expect(result.total).toBeGreaterThanOrEqual(12);
    const videos = await m.catalog.listProducts({ kind: "video" });
    expect(videos.items.length).toBeGreaterThan(0);
    expect(videos.items.every((p) => p.kind === "video")).toBe(true);
  });

  it("exposes product detail with embedded category", async () => {
    const product = await m.catalog.getProductBySlug("royal-tamil-wedding-video");
    expect(product).not.toBeNull();
    expect(product!.price_selling).toBe(1499);
    expect(product!.category?.slug).toBeTruthy();
  });

  it("supports search, price filters and sorting from the database", async () => {
    const search = await m.catalog.listProducts({ q: "royal" });
    expect(search.items.length).toBeGreaterThan(0);

    const cheap = await m.catalog.listProducts({ maxPrice: 800, pageSize: 50 });
    expect(cheap.items.length).toBeGreaterThan(0);
    expect(cheap.items.every((p) => Number(p.price_selling) <= 800)).toBe(true);

    const sorted = await m.catalog.listProducts({ sort: "price_asc", pageSize: 50 });
    const prices = sorted.items.map((p) => Number(p.price_selling));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const paged = await m.catalog.listProducts({ pageSize: 4, page: 2 });
    expect(paged.items.length).toBeLessThanOrEqual(4);
    expect(paged.page).toBe(2);
  });

  it("loads themes and content", async () => {
    const themes = await m.catalog.listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(8);
    const quotes = await m.catalog.listQuotes();
    expect(quotes.length).toBeGreaterThanOrEqual(10);
    const faqs = await m.catalog.listFaqs();
    expect(faqs.length).toBeGreaterThan(0);
  });
});

describe("admin product management persists", () => {
  it("saves a price change and reads it back", async () => {
    const sb = m.admin.safeServiceSupabase();
    expect(sb).not.toBeNull();
    const product = await m.catalog.getProductBySlug("floral-cinematic-wedding-video");
    expect(product).not.toBeNull();

    const { error } = await sb!.from("products").update({ price_selling: 2499 }).eq("id", product!.id);
    expect(error).toBeNull();

    const reread = await m.catalog.getProductBySlug("floral-cinematic-wedding-video");
    expect(Number(reread!.price_selling)).toBe(2499);
  });

  it("creates, edits, publishes and deletes a product", async () => {
    const sb = m.admin.safeServiceSupabase()!;
    const { data, error } = await sb
      .from("products")
      .insert({
        name: "Test Invitation Package",
        slug: `test-invitation-${Date.now()}`,
        kind: "video",
        price_original: 1000,
        price_selling: 800,
        status: "draft",
        tags: ["test", "video"],
      })
      .select("id, slug, status")
      .single();
    expect(error).toBeNull();
    expect(data.status).toBe("draft");
    // drafts are not visible on the storefront
    expect(await m.catalog.getProductBySlug(data.slug)).toBeNull();

    const { error: pubErr } = await sb.from("products").update({ status: "published" }).eq("id", data.id);
    expect(pubErr).toBeNull();
    const published = await m.catalog.getProductBySlug(data.slug);
    expect(published?.name).toBe("Test Invitation Package");

    const { error: delErr } = await sb.from("products").delete().eq("id", data.id);
    expect(delErr).toBeNull();
    expect(await m.catalog.getProductBySlug(data.slug)).toBeNull();
  });
});

describe("coupons are validated server-side against real rows", () => {
  it("accepts a valid coupon and rejects an unknown one", async () => {
    const product = await m.catalog.getProductBySlug("royal-tamil-wedding-video");
    const subtotal = Math.round(Number(product!.price_selling) * 100);

    const ok = await m.coupons.checkCoupon({
      code: "FESTIVE200",
      userId: "00000000-0000-0000-0000-000000000001",
      subtotalPaise: subtotal,
      cartProductIds: [product!.id],
      cartCategoryIds: [],
    });
    expect(ok.result.valid).toBe(true);
    expect(ok.result.discountPaise).toBe(20000);

    const bad = await m.coupons.checkCoupon({
      code: "DOESNOTEXIST",
      userId: null,
      subtotalPaise: subtotal,
      cartProductIds: [product!.id],
      cartCategoryIds: [],
    });
    expect(bad.result.valid).toBe(false);
  });

  it("enforces minimum purchase", async () => {
    const result = await m.coupons.checkCoupon({
      code: "FESTIVE200",
      userId: null,
      subtotalPaise: 10000, // ₹100 < ₹1499 minimum
      cartProductIds: [],
      cartCategoryIds: [],
    });
    expect(result.result.valid).toBe(false);
  });
});

describe("orders, payments and status transitions", () => {
  let orderId = "";
  const userA = USER_A;
  const userB = USER_B;

  it("creates a pending order owned by the buyer", async () => {
    const product = await m.catalog.getProductBySlug("premium-wedding-website");
    const totals = {
      lines: [
        {
          productId: product!.id,
          name: product!.name,
          kind: product!.kind,
          quantity: 1,
          unitPaise: 299900,
          addonsPaise: 0,
          lineSubtotalPaise: 299900,
          taxRate: 0,
          customizationFeePaise: 0,
        },
      ],
      subtotalPaise: 299900,
      discountPaise: 0,
      taxPaise: 0,
      grandPaise: 299900,
    };
    const created = await m.orders.createPendingOrder({
      userId: userA,
      email: "buyer-a@example.com",
      phone: "+919000000009",
      customer: { name: "Buyer A" },
      totals: totals as never,
      couponCode: null,
    });
    orderId = created.id;
    expect(created.orderNumber).toMatch(/^WIP-\d{4}-\d{6}$/);

    const order = await m.orders.getOrderById(orderId);
    expect(order!.status).toBe("pending_payment");
    expect(order!.payment_status).toBe("pending");
    expect(order!.items?.length).toBe(1);
    expect(Number(order!.grand_total)).toBe(2999);
  });

  it("keeps orders private to their owner", async () => {
    expect(await m.orders.getOrderOwned(orderId, userB, false)).toBeNull();
    expect(await m.orders.getOrderOwned(orderId, userA, false)).not.toBeNull();
    expect(await m.orders.getOrderOwned(orderId, userB, true)).not.toBeNull(); // admins can read
  });

  it("is idempotent when the same payment is captured twice", async () => {
    const first = await m.orders.markOrderPaid({
      orderId,
      provider: "razorpay",
      providerOrderId: "order_test_1",
      providerPaymentId: "pay_test_duplicate",
      amountPaise: 299900,
      signatureVerified: true,
    });
    expect(first.alreadyPaid).toBe(false);

    const second = await m.orders.markOrderPaid({
      orderId,
      provider: "razorpay",
      providerOrderId: "order_test_1",
      providerPaymentId: "pay_test_duplicate",
      amountPaise: 299900,
      signatureVerified: true,
    });
    expect(second.alreadyPaid).toBe(true);

    const payments = await m.orders.listPaymentsForOrder(orderId);
    expect(payments.length).toBe(1);
  });

  it("persists fulfilment status updates and history", async () => {
    const err = await m.orders.updateOrderStatus({
      orderId,
      to: "in_progress",
      changedBy: userA,
      note: "Designer assigned",
    });
    expect(err).toBeNull();

    const order = await m.orders.getOrderById(orderId);
    expect(order!.status).toBe("in_progress");

    const history = await m.orders.listStatusHistory(orderId);
    expect(history.length).toBeGreaterThanOrEqual(2);

    const stats = await m.orders.getOrderStats();
    expect(stats.totalOrders).toBeGreaterThanOrEqual(1);
    expect(stats.revenuePaise).toBeGreaterThanOrEqual(299900);
  });

  it("refuses to downgrade a paid order to pending payment", async () => {
    const err = await m.orders.updateOrderStatus({ orderId, to: "pending_payment", changedBy: userA });
    expect(err).toBeTruthy();
  });

  it("appears in the admin order list and CSV-relevant filters", async () => {
    const list = await m.orders.listOrdersAdmin({ status: "all", pageSize: 50 });
    expect(list.items.some((o) => o.id === orderId)).toBe(true);
    expect(list.items.find((o) => o.id === orderId)?.items?.length).toBe(1);
  });
});

describe("customer invitation websites are isolated per customer", () => {
  const userA = USER_C;
  const userB = USER_D;
  const productPromise = () => m.catalog.getProductBySlug("animated-wedding-website");

  it("creates separate rows, slugs and configs per customer", async () => {
    const product = await productPromise();
    const a = await m.customizations.createCustomization({
      userId: userA,
      productId: product!.id,
      productName: product!.name,
      title: "Ananya & Arjun",
      config: { coupleNames: "Ananya & Arjun", bg: "#FAF7F1" },
    });
    const b = await m.customizations.createCustomization({
      userId: userB,
      productId: product!.id,
      productName: product!.name,
      title: "Priya & Karthik",
      config: { coupleNames: "Priya & Karthik", bg: "#F3EAD9" },
    });
    expect(a.id).not.toBe(b.id);
    expect(a.slug).not.toBe(b.slug);

    const savedA = await m.customizations.getUserCustomization(a.id, userA);
    expect(savedA!.config).toMatchObject({ coupleNames: "Ananya & Arjun" });
    // customer B cannot open customer A's invitation
    expect(await m.customizations.getUserCustomization(a.id, userB)).toBeNull();

    const listA = await m.customizations.listUserCustomizations(userA);
    expect(listA.every((c) => c.user_id === userA)).toBe(true);
  });

  it("publishes only with an explicit status change and keeps drafts private", async () => {
    const drafts = await m.customizations.listUserCustomizations(userA);
    const draft = drafts[0];
    expect(draft.status).toBe("draft");
    expect(await m.customizations.getPublishedCustomization(draft.slug)).toBeNull();

    await m.customizations.setCustomizationStatus({ id: draft.id, userId: userA, status: "published" });
    const published = await m.customizations.getPublishedCustomization(draft.slug);
    expect(published?.title).toContain("Ananya");
  });
});

describe("local storage (development backend)", () => {
  it("stores files, serves public URLs and rejects traversal", async () => {
    const { localStorageApi, signMediaPath, verifyMediaSignature } = await import("@/lib/local/storage");
    const storage = localStorageApi();
    const bytes = new TextEncoder().encode("hello-media");
    const uploaded = await storage.from("public-media").upload("test/sample.txt", bytes, { contentType: "text/plain" });
    expect(uploaded.error).toBeNull();

    const publicUrl = storage.from("public-media").getPublicUrl("test/sample.txt");
    expect(publicUrl.data.publicUrl).toBe("/media/public-media/test/sample.txt");

    const signed = signMediaPath("deliverables", "u1/order/file.pdf", 60);
    const url = new URL(`http://x${signed}`);
    expect(verifyMediaSignature("deliverables", "u1/order/file.pdf", url.searchParams.get("exp"), url.searchParams.get("sig"))).toBe(true);
    expect(verifyMediaSignature("deliverables", "u1/order/other.pdf", url.searchParams.get("exp"), url.searchParams.get("sig"))).toBe(false);

    const traversal = await storage.from("public-media").upload("../../etc/passwd", bytes, {});
    expect(traversal.error).not.toBeNull();
  });
});
