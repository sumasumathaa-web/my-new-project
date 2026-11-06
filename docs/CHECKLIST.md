# Implementation checklist

Status legend: **✅ done & exercised** · **🟡 implemented, needs your credentials/content** · **⛔ not implemented**

## Storefront
| Requirement | Status | Notes |
|---|---|---|
| Home with hero, sections, announcement bar, newsletter, WhatsApp, footer | ✅ | Section order/visibility edited in Admin → Homepage Editor |
| Category pages (videos, websites, cards, engagement, reception, save-the-date) | ✅ | 28 seeded categories incl. sub-categories |
| Wedding themes page | ✅ | 8 seeded themes, published/featured flags |
| Invitation quotes & wording | ✅ | 12 seeded quotes, English + Tamil column (`text_ta`) |
| Custom design services page | ✅ | Contact/brief CTA |
| Offers & discounts page | ✅ | Reads campaign banners + active coupons from DB |
| Product detail (gallery, video, demo link, add-ons, dynamic price) | ✅ | Slug URLs, canonical + JSON-LD Product schema |
| Search, filters (kind/price), sorting, pagination | ✅ | Database-backed; integration-tested |
| Cart / checkout / success / failed | ✅ | Server-recomputed totals |
| Login, register, forgot password, reset | ✅ | Supabase Auth in prod; local sessions in dev mode |
| Customer account, orders, favorites, customizations, support, notifications | ✅ | Preferences = marketing consent + password reset |
| Contact, About, FAQs, Privacy, Terms, Refund, License, Delivery/Revision | ✅ | Policy pages are DB-editable templates |
| Custom 404 + error boundary | ✅ | |
| All public pages update when admin edits branding/settings | ✅ | `site_settings` read on every request |
| No links to non-existent pages | ✅ | Crawled 86 internal links → 0 failures |

## Catalogue & admin
| Requirement | Status | Notes |
|---|---|---|
| 12 demo products with required prices | ✅ | Flagged `is_demo`; prices editable |
| Create / edit / delete / duplicate / draft / publish / archive | ✅ | Confirmation on delete; audit-logged |
| Featured, unavailable status, tags, categories, media, related products | ✅ | |
| Bulk publish/unpublish/feature | ✅ | Admin → Products |
| Explicit product reordering UI | 🟡 | `sort_order` is editable per product and used for ordering; there is no drag/↑↓ reorder screen for products (categories have ↑↓) |
| Price management incl. sale price, customization fee, extra revision fee, tax, discount % | ✅ | Server-validated invariants |
| Categories CRUD + reorder + publish | ✅ | Delete blocked while products are attached |
| Themes CRUD, pricing, demo URLs, publish/feature/reorder | ✅ | |
| Quotes/FAQs/policy pages/promotional content CMS | ✅ | Markdown-lite renderer (no unsafe HTML) |
| Offers: %/fixed, codes, dates, min purchase, max discount, usage limits, first-order, product/category scope, enable/disable, banners, usage report | ✅ | Coupon rules covered by unit + integration tests |
| Media library (upload, list, delete, size/MIME limits) | 🟡 | Fully wired to Supabase Storage; no sample media shipped |
| Homepage editor (hero copy, CTAs, images/video, sections, order) | ✅ | Persisted in `site_settings.homepage` |
| Branding: name, tagline, logo, favicon, colours, contact, socials, currency, language, SEO | ✅ | |
| Orders: filters, search, detail, payment refs, status updates, notes, deliverables, cancel, refund, CSV | ✅ | Status history + audit log |
| Customers, reports, roles, audit logs | ✅ | |
| Dashboard KPIs from real data | ✅ | No hardcoded numbers |

## Customer invitation websites
| Requirement | Status | Notes |
|---|---|---|
| Schema-driven template editor (names, photos, date/time, venue, map, family, schedule, gallery, wording, colours, fonts, music, countdown, RSVP) | ✅ | Fields appear per product schema |
| Live preview, draft save, publish/unpublish, revisions/restore | ✅ | |
| Customer-specific URL, mobile preview, server validation | ✅ | `/w/[slug]`, `/rsvp/[slug]` |
| Publishing one customer's site never overwrites another's | ✅ | Integration test |
| Publish requires a paid order for that product | ✅ | Server-side check |

## Commerce, payments, security
| Requirement | Status | Notes |
|---|---|---|
| Server-side price/coupon/tax recalculation | ✅ | Unit + integration tested |
| Razorpay order creation, signature verify, webhook verify, idempotency, refund recording | 🟡 | Code path complete and unit-tested; **needs live/test Razorpay keys** — currently test mode, no fabricated payments |
| Email notifications | 🟡 | Provider integration present; defaults to audit-log because no provider keys |
| RLS + server-side authorisation, admin route protection | ✅ | Verified: anonymous → redirect; customer → denied |
| Rate limiting on login/register/reset/checkout/coupon | ✅ | In-memory (swap for durable limiter on serverless) |
| Audit logging of admin mutations and payment events | ✅ | |
| Security headers, upload validation, safe rendering | ✅ | CSP, nosniff, referrer policy, permissions policy |
| No hardcoded admin password / no public admin signup | ✅ | `scripts/grant-admin.mjs` only; signup creates customers |
| Database migrations, seed, FK/unique/indexes, timestamps | ✅ | 5 migrations + seed; run identically on Supabase and locally |

## SEO, accessibility, quality
| Requirement | Status | Notes |
|---|---|---|
| Per-page metadata, OG, canonical, sitemap, robots, JSON-LD | ✅ | |
| Semantic HTML, labels, keyboard focus styles, aria attributes | ✅ | |
| Responsive layouts (mobile → desktop) | ✅ | Tailwind breakpoints; not screenshot-tested per device |
| Optimised/remote images, lazy loading | 🟡 | No image assets shipped; `<img>` used with explicit sizing |
| Tests + production build | ✅ | 46 tests pass; `next build` passes; Vercel deployment |

## Explicitly not implemented
* **Full Tamil UI translation.** Tamil is supported as *content* (quotes have a Tamil column, products/
  categories/themes can hold Tamil text, `lang` attribute switches) — the interface strings themselves are
  English-only.
* **Customer testimonials/reviews.** No genuine reviews exist, so none are fabricated or displayed. A review
  table + moderation screen would be the next step.
* **Automated payment end-to-end test.** Requires Razorpay test credentials and network access from the
  build environment; signature/idempotency logic is unit-tested instead.
* **Visual regression / device-lab tests.** Responsive behaviour is CSS-implemented but not screenshot-tested.
