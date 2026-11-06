import { getBranding, getRegional } from "@/lib/settings";
import { saveBrandingAction, saveRegionalAction } from "../actions-site";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function ConfigStatus({ label, configured, hint }: { label: string; configured: boolean; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#EFE7D6] p-4">
      <div>
        <p className="font-medium text-charcoal">{label}</p>
        <p className="text-xs text-charcoal-muted">{hint}</p>
      </div>
      <Badge tone={configured ? "green" : "amber"}>{configured ? "configured" : "missing"}</Badge>
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const [branding, regional] = await Promise.all([getBranding(), getRegional()]);

  const paymentsConfigured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const webhookConfigured = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  const testMode = (process.env.PAYMENTS_TEST_MODE ?? "true") !== "false";
  const emailConfigured = Boolean(
    process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || process.env.POSTMARK_SERVER_TOKEN || process.env.SENDGRID_API_KEY || process.env.SMTP_URL
  );

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-2xl text-charcoal">Settings</h2>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy" role="alert">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved. The whole storefront picked up the change.</p>
      ) : null}

      {/* Branding */}
      <form action={saveBrandingAction} className="card space-y-5 p-6">
        <div>
          <h3 className="font-serif text-xl text-charcoal">Branding &amp; identity</h3>
          <p className="text-sm text-charcoal-muted">Shown across every public page, email and invoice. Changes go live immediately.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="businessName">Business name *</label>
            <input id="businessName" name="businessName" required maxLength={120} defaultValue={branding.businessName} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" maxLength={160} defaultValue={branding.tagline} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="primaryColor">Primary colour (hex)</label>
            <div className="flex gap-2">
              <input id="primaryColor" name="primaryColor" maxLength={7} defaultValue={branding.primaryColor} pattern="#[0-9A-Fa-f]{6}" className="input font-mono" />
              <span className="h-10 w-10 shrink-0 rounded-full border" style={{ background: branding.primaryColor }} aria-hidden />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="accentColor">Accent colour (hex)</label>
            <div className="flex gap-2">
              <input id="accentColor" name="accentColor" maxLength={7} defaultValue={branding.accentColor} pattern="#[0-9A-Fa-f]{6}" className="input font-mono" />
              <span className="h-10 w-10 shrink-0 rounded-full border" style={{ background: branding.accentColor }} aria-hidden />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="logoPath">Logo image (path from Media library)</label>
            <input id="logoPath" name="logoPath" maxLength={400} defaultValue={branding.logoPath ?? ""} className="input font-mono text-xs" placeholder="brand/logo.png" />
          </div>
          <div>
            <label className="label" htmlFor="faviconPath">Favicon (path)</label>
            <input id="faviconPath" name="faviconPath" maxLength={400} defaultValue={branding.faviconPath ?? ""} className="input font-mono text-xs" placeholder="brand/favicon.png" />
          </div>
          <div>
            <label className="label" htmlFor="websiteTitle">Website title (browser tab / SEO)</label>
            <input id="websiteTitle" name="websiteTitle" maxLength={160} defaultValue={branding.websiteTitle} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="language">Default language</label>
            <select id="language" name="language" defaultValue={branding.language} className="input">
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>

        <h4 className="font-serif text-lg text-charcoal">Contact</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" maxLength={254} defaultValue={branding.email} className="input" /></div>
          <div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" maxLength={30} defaultValue={branding.phone} className="input" /></div>
          <div><label className="label" htmlFor="whatsapp">WhatsApp number (with country code)</label><input id="whatsapp" name="whatsapp" maxLength={20} defaultValue={branding.whatsapp} className="input" placeholder="+919876543210" /></div>
          <div><label className="label" htmlFor="address">Address (shown on Contact page)</label><input id="address" name="address" maxLength={400} defaultValue={branding.address} className="input" /></div>
        </div>

        <h4 className="font-serif text-lg text-charcoal">Social links</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="instagram">Instagram URL</label><input id="instagram" name="instagram" maxLength={300} defaultValue={branding.instagram} className="input" placeholder="https://instagram.com/yourbrand" /></div>
          <div><label className="label" htmlFor="facebook">Facebook URL</label><input id="facebook" name="facebook" maxLength={300} defaultValue={branding.facebook} className="input" /></div>
          <div><label className="label" htmlFor="youtube">YouTube URL</label><input id="youtube" name="youtube" maxLength={300} defaultValue={branding.youtube} className="input" /></div>
          <div><label className="label" htmlFor="twitter">Twitter/X URL</label><input id="twitter" name="twitter" maxLength={300} defaultValue={branding.twitter} className="input" /></div>
        </div>

        <h4 className="font-serif text-lg text-charcoal">SEO defaults</h4>
        <div className="grid gap-4">
          <div><label className="label" htmlFor="seoDescription">Meta description</label><textarea id="seoDescription" name="seoDescription" rows={2} maxLength={300} defaultValue={branding.seoDescription} className="input" /></div>
          <div><label className="label" htmlFor="seoKeywords">Keywords (comma separated)</label><input id="seoKeywords" name="seoKeywords" maxLength={300} defaultValue={branding.seoKeywords} className="input" /></div>
          <input type="hidden" name="currency" value="INR" />
        </div>

        <button className="btn-burgundy px-6 py-2.5">Save branding</button>
      </form>

      {/* Regional */}
      <form action={saveRegionalAction} className="card space-y-4 p-6">
        <div>
          <h3 className="font-serif text-xl text-charcoal">Regional &amp; tax</h3>
          <p className="text-sm text-charcoal-muted">Tax rate applies to all prices at checkout (0% = no tax shown).</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="taxRate">GST / tax rate (%)</label>
            <input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100" defaultValue={regional.taxRate} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="regional-currency">Currency</label>
            <select id="regional-currency" name="currency" defaultValue={regional.currency} className="input">
              <option value="INR">INR — Indian Rupee (₹)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="regional-language">Price/labels language</label>
            <select id="regional-language" name="language" defaultValue={regional.language} className="input">
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
        <button className="btn-outline px-5 py-2 text-sm">Save regional settings</button>
      </form>

      {/* Payments */}
      <div className="card space-y-3 p-6">
        <h3 className="font-serif text-xl text-charcoal">Payments (Razorpay)</h3>
        <p className="text-sm text-charcoal-muted">
          Secrets live in environment variables only — never in the database or code. Configure them in your hosting provider dashboard.
        </p>
        <div className="space-y-3">
          <ConfigStatus
            label="Razorpay keys"
            configured={paymentsConfigured}
            hint="NEXT_PUBLIC_RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET"
          />
          <ConfigStatus
            label="Webhook secret"
            configured={webhookConfigured}
            hint="RAZORPAY_WEBHOOK_SECRET — server-side capture fallback"
          />
          <ConfigStatus
            label="Test mode banner"
            configured={!testMode}
            hint={testMode ? "PAYMENTS_TEST_MODE=true — orders bypass Razorpay; safe to test. Set to false for live payments." : "Live payments enabled — real money."}
          />
        </div>
      </div>

      {/* Email */}
      <div className="card space-y-3 p-6">
        <h3 className="font-serif text-xl text-charcoal">Transactional email</h3>
        <p className="text-sm text-charcoal-muted">
          Provider selected via EMAIL_PROVIDER; key in EMAIL_API_KEY (or provider-specific var). When missing, emails are skipped silently and orders still complete.
        </p>
        <ConfigStatus
          label={`Email provider: ${process.env.EMAIL_PROVIDER ?? "(not set)"}`}
          configured={emailConfigured}
          hint="Supported: resend, postmark, sendgrid, smtp (SMTP_URL)"
        />
      </div>

      {/* Storage */}
      <div className="card p-6">
        <h3 className="font-serif text-xl text-charcoal">Storage buckets</h3>
        <ul className="mt-3 space-y-1 text-sm text-charcoal-muted">
          <li><code className="font-mono">public-media</code> — public website images/video (media library)</li>
          <li><code className="font-mono">customer-uploads</code> — private customer artwork (uploads API)</li>
          <li><code className="font-mono">deliverables</code> — private finished invitation files, signed URLs only after payment</li>
        </ul>
        <p className="mt-2 text-xs text-charcoal-muted">Buckets are created by migration 0001 and managed in the Supabase dashboard.</p>
      </div>
    </div>
  );
}
