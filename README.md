# Wedding Invitation Platform

A complete, production-grade e-commerce platform for digital wedding stationery — invitation videos, digital cards, wedding websites, save-the-dates, quote wording packs and custom design services.

**Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Razorpay (INR payments) · Vitest

> "Your Brand Name" is a placeholder. Everything customer-facing (name, logo, colors, contact details, social links, hero copy, announcement bar, footer, default language/currency/tax) is edited from **Admin → Settings / Homepage** and updates the live site immediately — no code changes, no redeploy.

---

## 1. Quick start (local)

```bash
npm install
cp .env.example .env.local   # fill in values (see §3)
npm run dev                  # http://localhost:3000
```

Then provision the database and first admin (§4).

## 2. What exists

### Customer-facing storefront
| Area | Routes |
|---|---|
| Home (composition controlled by Homepage Editor) | `/` |
| Catalog landings | `/invitation-videos`, `/digital-cards`, `/invitation-websites`, `/save-the-date`, `/engagement-invitations`, `/reception-invitations`, `/custom-design`, `/themes`, `/quotes`, `/offers`, `/faqs` |
| Product detail (gallery, video preview, demo link, add-ons, live customization schema) | `/products/[slug]` |
| Discovery | `/search` |
| Commerce | `/cart`, `/checkout`, `/checkout/success/[orderId]`, `/checkout/failed` |
| Auth | `/login`, `/register`, `/forgot-password`, `/auth/reset`, `/auth/callback` |
| Content/legal (DB-editable) | `/about`, `/privacy-policy`, `/terms`, `/refund-policy`, `/delivery-policy`, `/license` |
| Support | `/contact` |
| Live invitations | `/w/[slug]` (public when published), `/rsvp/[slug]` |
| Custom 404 | `not-found.tsx` |

### Customer account
`/account` (profile + notification consent) · `/account/orders` + `/account/orders/[id]` (status timeline, deliverable downloads via signed URLs, only after payment) · `/account/favorites` · `/account/support` + thread view · `/account/customizations` (draft list) · `/account/customizations/new` · `/account/customizations/[id]` — schema-driven editor with live preview, revision history, publish/unpublish.

### Admin dashboard (`/admin`, requires `admin` role)
Overview (real stats) · Products (list/search/bulk status/duplicate) + rich editor (pricing invariants enforced: `sale < selling ≤ original`, JSON schema validation for customization fields & add-ons, gallery manager) · Categories (with delete-guard against attached products, ↑↓ reorder) · Themes · Quotes & Content (quotes/FAQs/policy pages) · Offers & Coupons (coupons + promo banners + usage report) · Orders (filters, CSV export, order detail: status transitions + customer emails, internal notes, offline payment recording with amount attestation, cancel rules, refunds) · Customers (search, order history, spend) · Media library (upload/rename/delete, public bucket) · Homepage editor (hero, announcement bar, section visibility & order, footer blurb) · Customer websites (draft/published/archived moderation) · Support inbox (thread reply → email) · Reports (7/30/90-day revenue, status distribution, best sellers, coupons, catalogue health) · Settings (branding, contact, socials, SEO defaults, regional/tax; payment & email **status indicators** — secrets stay in env vars only) · Roles (grant/revoke admin/editor/support; self-revoke blocked) · Audit logs (every admin mutation, payment event, role change).

## 3. Environment variables (`.env.example` is the template)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project URL + public anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** key used by server actions/API routes |
| `SUPABASE_DB_URL` | Direct Postgres URI (scripts: seed, grant-admin, backups) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (sitemap, emails, OAuth redirects) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay keys; webhook secret verifies `payment.captured` events |
| `PAYMENTS_TEST_MODE` | `true` = test-friendly flow (order placed without Razorpay modal; clearly labelled). Set `false` only when live keys are in place. |
| `EMAIL_PROVIDER` + keys (`EMAIL_API_KEY`/`RESEND_API_KEY`/`POSTMARK_SERVER_TOKEN`/`SENDGRID_API_KEY`/`SMTP_URL`) / `EMAIL_FROM` | Transactional email. Default `log` = write to audit log instead of sending. Failures never break checkout. |
| `ADMIN_SETUP_EMAILS` | Comma-separated emails allowed to receive admin via `scripts/grant-admin.mjs` |
| `STORAGE_BUCKET_PUBLIC` / `STORAGE_BUCKET_CUSTOMER` / `STORAGE_BUCKET_DELIVERABLES` | Bucket names created by migration 0001 |

**Never** commit `.env.local` — it is git-ignored. Secrets are read only in server code.

## 4. Database setup

Migrations live in `supabase/migrations/` (run in filename order against your Supabase SQL editor, or via Supabase CLI `supabase db push`).

- `0001_init.sql` — schema: products, categories, themes, quotes, FAQs, orders, order_items, payments, coupons, coupon_usages, customizations, revisions, support threads, media registry, site_settings, audit_logs, RLS policies, storage buckets (`public-media` public; `customer-uploads` + `deliverables` private).
- `supabase/seed.sql` — **demo catalog** (12 fictional products clearly tagged "(DEMO)", demo categories, quote wording, FAQs, policy pages, a demo coupon). Safe to delete; admin can mark them archived.

After migrations:

```bash
# create the first admin (creates auth account if missing)
node scripts/grant-admin.mjs you@example.com "YourStr0ngPass!" --create
```

## 5. Payments flow (how "paid" can ever happen)

Only THREE paths can set `payment_status = 'paid'`:

1. **Razorpay checkout verify** (`/api/payments/verify`) — requires a valid `order_id|payment_id` HMAC signature. Idempotent via unique `provider_payment_id`.
2. **Razorpay webhook** (`/api/webhooks/razorpay`) — validates `X-Razorpay-Signature` over the *raw* body; handles `payment.captured` / `payment.failed`. Idempotent via unique `webhook_event_id`.
3. **Admin "record offline payment"** — requires the exact order total + reference + explicit confirmation checkbox; audited, and it never claims `signature_verified`.

Visiting `/checkout/success/[orderId]` is read-only. Prices, add-ons, taxes, totals and coupon discounts are **always recomputed server-side** from DB rows — anything the browser posts is treated only as a list of product ids + quantities.

## 6. Customization engine

- Admin marks a product "customer can personalise" and provides a JSON schema of fields (`text/textarea/date/time/color/select/url/image/checkbox`).
- Customer buys it → `/account/customizations/new` creates a draft → editor (`/account/customizations/[id]`) shows live preview of the final invitation page.
- Publishing requires a paid order containing that product (server-checked, HTTP 403 otherwise).
- Published invite is public at `/w/[slug]` with guest RSVP (`show_rsvp` field) and live countdown. Revisions are versioned; restore supported.

## 7. Media

- Public images/video previews → `public-media` (Media Library).
- Customer invitation uploads → `customer-uploads/…/invites/{uid}/` (public read by design — `/w/[slug]` is a public page; documented).
- Deliverables → `deliverables/{userId}/{orderId}/…` served only via 5-minute signed URLs, and only after payment.

## 8. Tests

```bash
npm run test       # vitest: pricing engine, coupon rules, Razorpay signatures, validation
npm run typecheck  # strict TS
npm run build      # production build
```

29 unit tests cover: paise arithmetic, sale-price invariants, add-on whitelist, customization fee rules, coupon min/max/limit/first-order/scope rules, tax-on-discounted-base, HMAC signature accept/reject/tamper cases, input validators.

## 9. Deployment

1. Create a Supabase project; run migrations + seed; note URL, anon key, service role key, DB URI.
2. Push this repo to GitHub; import into Vercel; set env vars from `.env.local` equivalents (never commit the file).
3. In Supabase Auth: set Site URL + redirect URLs (`https://your-domain/auth/callback`).
4. In Razorpay dashboard: create webhook → `https://your-domain/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`; set `RAZORPAY_WEBHOOK_SECRET`.
5. Set `PAYMENTS_TEST_MODE=false` only after test orders succeed.
6. Grant yourself admin: `node scripts/grant-admin.mjs you@example.com --create "…"`.

## 10. Demo logins (this workspace's seeded project)

| Purpose | Login |
|---|---|
| Admin | `demo-admin@yourbrand.example` |
| Customer | `demo-customer@example.com` |

Passwords were generated during setup — see your local notes; rotate before any real launch.

## 11. Security notes

- RLS enabled on every table; admin checks enforced server-side on every action; API routes return 401/403 without sessions/roles.
- Order/payment writes only in service-role server code; customers never write orders directly.
- Rate limiting on checkout, coupon validation, uploads, contact, RSVP, customization saves, admin uploads.
- Inputs validated (length, enum, hex color, URL scheme, slug/uuid formats). XSS-safe by React escaping; markdown-lite renderer escapes HTML before transform.
- Audit log is append-only.
