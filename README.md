# Wedding Invitation Platform

A production-grade e-commerce platform for digital wedding stationery — invitation videos, wedding
websites, digital cards, save-the-dates, quote/wording packs and custom design services.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) ·
Razorpay (INR) · Vitest · Vercel

> **Branding is not hardcoded.** Every customer-facing string (business name, tagline, logo, colours,
> contact details, socials, hero copy, announcement bar, footer, policies) is stored in the database and
> edited from **Admin → Branding & Settings / Homepage Editor**. “Your Brand Name” is only a placeholder
> default until the owner sets their own.

---

## 1. Run it locally (no external services required)

```bash
npm install
npm run dev          # http://localhost:3000  (creates the local database first)
npm run db:reset     # wipe and recreate the local database
```

With **no Supabase credentials present**, the app starts an **embedded PostgreSQL** (PGlite — Postgres
compiled to WebAssembly) inside `.data/`, applies the *same* SQL migrations and seed file that Supabase
uses, and creates two demo accounts. This is a real SQL database, not mocked data, so every page,
admin action, cart and order works offline.

| Local demo login | Email | Password |
|---|---|---|
| Administrator | `admin@yourbrand.local` | `Password123!` |
| Customer | `customer@yourbrand.local` | `Password123!` |

Override the demo password with `LOCAL_DEMO_PASSWORD`, or delete `.data/` to re-bootstrap from scratch.
Local mode is automatically disabled on Vercel and whenever Supabase credentials exist.

## 2. Run it against Supabase (production parity)

```bash
cp .env.example .env.local     # add your Supabase URL, anon key, service-role key
npm run dev
```

Then apply `supabase/migrations/*.sql` (in order) and `supabase/seed.sql` in the Supabase SQL editor,
or with the Supabase CLI (`supabase db push`). Full walkthrough: **[docs/SETUP.md](docs/SETUP.md)**.

Create the first administrator with a password of your choosing (never commit it):

```bash
node scripts/grant-admin.mjs you@example.com 'YourStrongPassword!' --create
```

Sign-up in the app creates *customers* only; the admin role is granted by this script (or by an existing
admin in **Admin → User Roles**). There is no public path to admin.

## 3. What is implemented

### Storefront
| Area | Routes |
|---|---|
| Home (sections, order and visibility controlled by the Homepage Editor) | `/` |
| Category landings | `/invitation-videos`, `/invitation-websites`, `/digital-cards`, `/engagement-invitations`, `/reception-invitations`, `/save-the-date`, `/custom-design` |
| Themes / quotes / offers / FAQs | `/themes`, `/quotes`, `/offers`, `/faqs` |
| Product detail (gallery, video preview, live demo link, add-ons, dynamic pricing) | `/products/[slug]` |
| Search + filters (kind, price, sort, pagination) | `/search` |
| Cart / checkout / result pages | `/cart`, `/checkout`, `/checkout/success/[orderId]`, `/checkout/failed` |
| Auth | `/login`, `/register`, `/forgot-password`, `/auth/reset`, `/auth/callback` |
| Legal & content (DB-editable) | `/about`, `/privacy-policy`, `/terms`, `/refund-policy`, `/delivery-policy`, `/license` |
| Contact + support | `/contact` |
| Live invitations (public when published) + RSVP | `/w/[slug]`, `/rsvp/[slug]` |
| 404 / error | `not-found.tsx`, `error.tsx` |

### Customer account
`/account` (profile, marketing consent) · `/account/orders` + `/account/orders/[id]` (status timeline,
signed deliverable downloads only after verified payment) · `/account/favorites` ·
`/account/customizations` (draft/published list) · `/account/customizations/new` ·
`/account/customizations/[id]` — schema-driven editor with live preview, revision history, publish/unpublish ·
`/account/support` (+ thread).

### Admin dashboard (`/admin`, `admin` role required, checked server-side)
Overview (live KPIs) · Products (+ editor with server-enforced pricing rules, gallery, JSON validation,
duplicate/bulk actions) · Categories (reorder, delete guards) · Themes · Quotes & Content (quotes, FAQs,
policy pages, promotional content) · Offers & Coupons (percentage/fixed, min purchase, caps, usage limits,
first-order, product/category scope, banners, usage report) · Orders (filters, CSV export, status timeline,
internal + customer notes, offline payment recording, refunds) · Customers · Media Library · Homepage Editor
(hero, announcement, section order/visibility) · Customer Websites (moderation) · Support inbox · Reports ·
Branding & Settings · User Roles · Audit Logs.

### Invitation website engine
Products can declare a JSON customisation schema (`text`, `textarea`, `date`, `time`, `color`, `select`,
`url`, `image`, `checkbox`). Customers fill it in with a **live preview**, save drafts, publish a
**customer-specific URL** and restore revisions. Publishing requires a paid order for that product and is
verified server-side; each customer's configuration lives in its own row, so publishing one invitation can
never touch another's. Guests can RSVP on published invitations; RSVPs are only readable by the owner/admin.

### Commerce & payments
The browser only ever sends *product ids, quantities, add-ons and a coupon code*; prices, discounts, tax and
totals are recomputed server-side from database rows. An order can become `paid` only through:

1. Razorpay checkout **signature verification** (`/api/payments/verify`),
2. Razorpay **webhook** with a valid `X-Razorpay-Signature` (`/api/webhooks/razorpay`), or
3. an admin recording an **offline payment** (audited, amount-attested, never marked signature-verified).

All three are idempotent (unique `provider_payment_id` / `event_id`), and visiting a success page never
changes payment state.

## 4. Verification performed

```bash
npm run typecheck   # strict TypeScript — passes
npm run test        # 46 tests — passes
npm run build       # production build — passes
```

46 automated tests: 29 unit tests (paise arithmetic, sale-price invariants, add-on allow-lists,
customisation fees, coupon rules, tax-on-discounted-base, Razorpay HMAC accept/reject/tamper, validators)
and 17 integration tests that run against a real Postgres database built from the same migrations/seed:
catalogue reads, search/filter/sort/pagination, admin product create→publish→delete persistence, coupon
validation from rows, order creation, duplicate-payment idempotency, ownership isolation, status history,
dashboard stats, per-customer invitation isolation and publishing, and storage path/signature rules.

Also verified by crawling the running app: 86 internal links, 0 broken.

**Admin → System Status** (`/admin/status`) shows the live backend, a timed read, per-key settings
timestamps, the last ten admin actions and a one-click *write test* — use it whenever a change needs
confirming against the real database.

## 5. Environment variables

See `.env.example` (template only — secrets are never committed). Summary:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project URL + public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** key for server actions/routes |
| `SUPABASE_DB_URL` | Direct Postgres URI for scripts/backups |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (sitemap, emails, auth redirects) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay keys |
| `PAYMENTS_TEST_MODE` | `true` (default) = orders stay *pending payment* until an admin verifies |
| `EMAIL_PROVIDER` + provider keys, `EMAIL_FROM` | Transactional email (`log` = write to audit log) |
| `ADMIN_SETUP_EMAILS` | Emails allowed to be promoted by `scripts/grant-admin.mjs` |
| `STORAGE_BUCKET_PUBLIC` / `_CUSTOMER` / `_DELIVERABLES` | Bucket names created by migration 0001 |
| `LOCAL_DB`, `LOCAL_DB_DIR`, `LOCAL_DEMO_PASSWORD`, `LOCAL_MEDIA_SECRET` | Local embedded-database mode only |

## 6. Deployment

Vercel + Supabase, driven from this GitHub repository. Step-by-step (including Razorpay webhooks, domain
setup, backups and rollback): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Architecture and design
decisions: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. Feature-by-feature status:
**[docs/CHECKLIST.md](docs/CHECKLIST.md)**.

## 7. Known limitations (explicit)

- **Payments run in test mode** until Razorpay keys are configured; orders are created as *pending payment*
  and no payment is ever simulated or auto-confirmed.
- **Transactional email** defaults to `log` (audit log) because no email provider credentials exist yet.
  Order/status emails are wired and queued at the call sites.
- **Media**: no product images/videos are seeded (the design renders elegant SVG/CSS artwork instead).
  Upload real assets in **Admin → Media Library**; Supabase Storage buckets are created by the migration.
- The embedded local database is for development/preview only; it is intentionally disabled on Vercel.
