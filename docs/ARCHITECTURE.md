# Architecture & Design Decisions

## 1. Runtime shape

```
Browser ── Next.js App Router (server components + server actions + route handlers)
                │
                ├── src/lib/db/*          business/data access (orders, catalog, coupons, customisations…)
                │       │
                │       └── DataClient port (src/lib/db/core.ts)
                │             ├── SupabasePostgREST adapter   → production
                │             └── Embedded Postgres adapter   → local dev/preview
                │
                ├── src/lib/settings.ts   DB-backed branding/homepage/regional settings
                ├── src/lib/pricing.ts    single source of truth for money (paise integers)
                └── src/lib/razorpay.ts   HMAC verification, server-only SDK use
```

**Decision: one narrow `DataClient` port instead of two code paths.**
All data access already went through `safeServiceSupabase()` / `serverSupabase()`. Those functions now return
a `DataClient` — either the supabase-js client wrapped in a thin adapter, or an embedded-Postgres
implementation of the same small interface (`from()`, `select/insert/update/upsert/delete`, filters,
ordering, range, counts, `single`/`maybeSingle`, embedded relations). Call sites were untouched, and the
production path remains exactly PostgREST/Supabase.

**Why an embedded database?** A machine (or CI/preview sandbox) without Supabase credentials previously
rendered an empty storefront, so nothing could be verified end-to-end. PGlite runs real PostgreSQL with the
repository's own migrations and seed, so the same SQL, constraints, triggers and seeds are exercised. It is
loaded through a **dynamic import** (`src/lib/local/registry.ts` + `serverComponentsExternalPackages`) so no
WebAssembly reaches the production bundle; `localModeEnabled()` returns false on Vercel.

**Decision: no server-side mocks anywhere.** Every page and action reads/writes the database. Demo content
is *rows* flagged `is_demo`, not hardcoded arrays.

## 2. Money

All arithmetic is in **integer paise** (`src/lib/pricing.ts`, `src/lib/money.ts`) and rounded once at the
boundary. The client never submits prices: `/api/checkout` accepts product ids, quantities, add-ons and a
coupon code, reloads products from the database and recomputes subtotal, discount, tax (on the discounted
base) and grand total. Sale-price invariants (`sale < selling ≤ original`) are validated again on the server
in the admin actions.

## 3. Payments

Three and only three paths can set `payment_status = 'paid'`:

1. `/api/payments/verify` — Razorpay checkout signature `HMAC_SHA256(order_id|payment_id)` compared with
   `timingSafeEqual`; amount cross-checked against the stored order total.
2. `/api/webhooks/razorpay` — signature over the **raw** body; handled for `payment.captured` /
   `payment.failed`; every delivered event id is stored in `payment_events` (unique) so replays are no-ops.
3. Admin "record offline payment" — explicit amount attestation + confirmation checkbox, audited, and never
   recorded as `signature_verified`.

`markOrderPaid()` is idempotent via the unique `payments.provider_payment_id` index. `/checkout/success` is
read-only. In test mode the order is created as `pending_payment` and the UI says so — nothing is simulated.

## 4. Authorisation

* Admin routes: `requireAdmin()` in `/admin/layout.tsx` (server-side, redirects non-admins) plus a
  per-action `requireAdmin()` in every server action; the middleware only refreshes the Supabase session.
* Customer data: every read is scoped by `user_id` in the query itself (`getOrderOwned`,
  `getUserCustomization`, `listUserOrders`), not by trusting a URL. Supabase RLS policies in migration 0003
  enforce the same rules at the database for anon/authenticated roles.
* Service-role key is imported only from server modules; a build-time check (`server-only` import in the
  data layer and no client imports of `lib/db/storage`) keeps it out of client bundles — this was verified by
  a failing production build that forced the media helpers to be split into `src/lib/media.ts`.
* File access: public bucket for marketing media, private buckets for customer uploads and deliverables;
  deliverables are served only through 5-minute signed URLs after payment (local mode: HMAC-signed `/media`).

## 5. Settings-driven branding

`site_settings` holds three JSON documents (`branding`, `homepage`, `regional`). `src/lib/settings.ts` merges
them over defaults marked `cache()` per request, so the layout, header, footer, hero, announcement bar, SEO
metadata and contact pages all update from **Admin → Branding & Settings / Homepage Editor** without a
redeploy. No brand string is compiled into the app; “Your Brand Name” exists only as a default value.

## 6. Invitation customisation

`products.customization_schema` (JSON) declares fields and allowed values. The customer editor renders the
form from that schema, validates on the client (immediate feedback) and again on the server
(`validateCustomizationPayload`). Each invitation is a row in `customizations` keyed by `user_id` with a
unique public slug; saving creates a row in `website_revisions` first, so history/restore works. Publishing
checks that the user has a paid order containing the product.

## 7. Rendering & performance

* Server components by default; client components only for cart, editor, dialogs and auth forms.
* `force-dynamic` on data-driven pages; no request-time surprises during build.
* Product/theme imagery uses plain `<img>`/CSS artwork rather than remote optimisation, so the app builds and
  renders with no external image host configured.
* Security headers (CSP, nosniff, referrer policy, permissions policy) are set in `next.config.mjs`;
  `X-Frame-Options` is deliberately omitted so the app can be embedded in preview environments.

## 8. Sequencing / gaps

Order + items are inserted as two statements (PostgREST cannot span a transaction without an RPC). Totals
are recomputed before insertion and the order is created as `pending_payment`, so a partial write can only
produce an unpaid order, never a paid one. If you need strict atomicity, add a `create_order` SQL function
and call it through a single RPC.
