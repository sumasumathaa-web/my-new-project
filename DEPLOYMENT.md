# Deployment — Vercel + Supabase

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Complete wedding invitation platform"
git remote add origin git@github.com:<you>/my-new-project.git
git push -u origin main
```

`.env.local` is git-ignored — never push secrets.

## 2. Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. Framework: Next.js (auto-detected). No build overrides needed.
3. **Environment Variables** — add every key from your `.env.local`, with production values:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-domain.com`
   - Razorpay keys + webhook secret; `PAYMENTS_TEST_MODE=false` only when ready
   - Email provider keys (optional)
   - `ADMIN_SETUP_EMAILS` = your admin emails
4. Deploy.

## 3. Supabase Auth — URLs

Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: `https://your-domain.com/auth/callback` (add `http://localhost:3000/auth/callback` for local dev)

## 4. Razorpay webhook

Dashboard → Webhooks → Add:

- URL: `https://your-domain.com/api/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`
- Secret → set as `RAZORPAY_WEBHOOK_SECRET` in Vercel.

## 5. Post-deploy smoke checklist

- [ ] `/` renders with your branding (set in Admin → Settings)
- [ ] Sign up a customer, add a product to cart, complete a Razorpay test payment → order appears in Admin → Orders as **paid**
- [ ] Webhook shows in Razorpay dashboard as delivered (and duplicate deliveries are ignored — idempotent)
- [ ] Customer sees order at `/account/orders`; after admin uploads a deliverable, download link appears
- [ ] Buy a customization-enabled product → draft invitation → publish → `/w/<slug>` is public, RSVP submissions appear in the editor
- [ ] Admin edits branding/homepage → storefront updates immediately

## 6. Backups

- Database: Supabase Pricing provides daily backups on paid plans; otherwise `pg_dump` via `SUPABASE_DB_URL` on a schedule.
- Storage: enable versioning or sync buckets nightly.

## 7. Going live checklist

- [ ] `PAYMENTS_TEST_MODE=false`, live Razorpay keys
- [ ] Email provider configured and a test order email received
- [ ] Tax rate set in Admin → Settings (GST if applicable)
- [ ] Policies reviewed in Admin → Content → Policy Pages
- [ ] Demo catalogue archived/hidden (products have `is_demo` flag)
- [ ] Domain + HTTPS active; sitemap reachable at `/sitemap.xml`
