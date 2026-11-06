# Setup Guide — From Zero to a Running Store

This walks a fresh machine + fresh Supabase project to a working storefront. Expected time: ~20 minutes.

## Prerequisites

- Node.js ≥ 20 (`node -v`)
- A free Supabase project (https://supabase.com → New project; region closest to your customers)
- (Payments) A Razorpay account — https://dashboard.razorpay.com → Settings → API Keys

## Step 1 — Get the code

```bash
git clone <your-repo-url> my-new-project
cd my-new-project
npm install
```

## Step 2 — Environment file

```bash
cp .env.example .env.local
```

Fill in, from your Supabase project (Settings → API):

| Key | Where to find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role" key — **server only** |
| `SUPABASE_DB_URL` | Settings → Database → Connection string (URI), with your DB password |

Leave Razorpay + email blank for now; the site works without them (`PAYMENTS_TEST_MODE=true`, email logs to the audit log).

## Step 3 — Database

In the Supabase dashboard → **SQL Editor**, run each file in `supabase/migrations/` in order, then `supabase/seed.sql` for the demo catalogue. Or with the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

The migrations create all tables, RLS policies, and the three storage buckets.

## Step 4 — First admin

```bash
node scripts/grant-admin.mjs you@example.com "ChooseAStrong!Password" --create
```

This creates the auth user (email auto-confirmed) and grants `customer` + `admin` roles. Then:

1. `npm run dev` → http://localhost:3000
2. Sign in at `/login` with those credentials.
3. Open `/admin` — you should see the dashboard. Visit **Settings** and set your real business name, logo, contact details; the placeholder text disappears from every page.

## Step 5 — Payments (when ready)

- Razorpay dashboard → Settings → API Keys: put key id/secret into `.env.local`.
- Webhooks: add endpoint `<your-domain>/api/webhooks/razorpay`, subscribe to `payment.captured` + `payment.failed`, set the secret to `RAZORPAY_WEBHOOK_SECRET`.
- Flip `PAYMENTS_TEST_MODE=false` and place a test order with Razorpay test card `4111 1111 1111 1111`.

## Step 6 — Email (optional)

Pick one provider and set keys:
- Resend: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`
- Postmark: `EMAIL_PROVIDER=postmark`, `POSTMARK_SERVER_TOKEN=...`
- SendGrid: `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY=SG....`
- Any SMTP relay: `EMAIL_PROVIDER=smtp`, `SMTP_URL=smtp(s)://user:pass@host:port`

Without it: order emails are recorded in Admin → Audit logs and no customer emails are sent (checkout still completes).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/admin` loops to `/login` | The sign-in never completed — check `mailer_autoconfirm` in Supabase Auth, or re-run grant-admin with `--create` |
| Home page empty | Run `supabase/seed.sql`, or create products in Admin → Products (status = published) |
| Images 404 in Media Library | Bucket `public-media` must be **public** (migration 0001 makes it so) |
| Razorpay checkout doesn't open | Set live/test keys; ensure `NEXT_PUBLIC_RAZORPAY_KEY_ID` is present and restart dev server |
| Emails not sent | They're in log mode by default; configure a provider above |
