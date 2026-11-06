import { getHomepage } from "@/lib/settings";
import { moveSectionAction, saveHomepageAction } from "../actions-site";
import { HOMEPAGE_SECTION_LABELS, HOMEPAGE_SECTION_IDS } from "@/lib/homepage-sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage editor" };

export default async function AdminHomepagePage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const homepage = await getHomepage();
  const orderMap = new Map(homepage.sectionOrder.map((s) => [s.id, s.enabled]));

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Homepage editor</h2>
      <p className="text-sm text-charcoal-muted">
        Every field saves straight to the database and updates the live storefront — no code changes, no redeploy.
      </p>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Homepage settings saved. The storefront is already updated.</p>
      ) : null}

      <form action={saveHomepageAction} className="space-y-6">
        {/* Hero */}
        <fieldset className="card grid gap-4 p-6">
          <legend className="sr-only">Hero section</legend>
          <h3 className="font-serif text-lg text-charcoal">Hero</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="heroTitle">Headline *</label>
              <input id="heroTitle" name="heroTitle" required maxLength={160} defaultValue={homepage.heroTitle} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="heroImagePath">Hero image path (Media library)</label>
              <input id="heroImagePath" name="heroImagePath" maxLength={400} defaultValue={homepage.heroImagePath ?? ""} className="input font-mono text-xs" placeholder="hero/main.jpg" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="heroSubtitle">Sub-headline</label>
            <textarea id="heroSubtitle" name="heroSubtitle" rows={2} maxLength={400} defaultValue={homepage.heroSubtitle} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="heroCtaLabel">Primary CTA label</label>
              <input id="heroCtaLabel" name="heroCtaLabel" maxLength={60} defaultValue={homepage.heroCtaLabel} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="heroCtaUrl">Primary CTA URL</label>
              <input id="heroCtaUrl" name="heroCtaUrl" maxLength={300} defaultValue={homepage.heroCtaUrl} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="heroCta2Label">Secondary CTA label</label>
              <input id="heroCta2Label" name="heroCta2Label" maxLength={60} defaultValue={homepage.heroCta2Label} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="heroCta2Url">Secondary CTA URL</label>
              <input id="heroCta2Url" name="heroCta2Url" maxLength={300} defaultValue={homepage.heroCta2Url} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="heroVideoUrl">Hero background video URL (optional)</label>
            <input id="heroVideoUrl" name="heroVideoUrl" maxLength={400} defaultValue={homepage.heroVideoUrl} className="input" />
          </div>
        </fieldset>

        {/* Announcement bar */}
        <fieldset className="card grid gap-4 p-6">
          <legend className="sr-only">Announcement bar</legend>
          <h3 className="font-serif text-lg text-charcoal">Announcement bar</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="announcementEnabled" defaultChecked={homepage.announcementEnabled} className="accent-burgundy" /> Show announcement bar
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="announcement">Message</label>
              <input id="announcement" name="announcement" maxLength={200} defaultValue={homepage.announcement} className="input" placeholder="Wedding season launch — flat 10% off with code WELCOME10" />
            </div>
            <div>
              <label className="label" htmlFor="announcementUrl">Link (optional)</label>
              <input id="announcementUrl" name="announcementUrl" maxLength={300} defaultValue={homepage.announcementUrl} className="input" placeholder="/offers" />
            </div>
          </div>
        </fieldset>

        {/* Sections */}
        <fieldset className="card p-6" id="sections">
          <legend className="sr-only">Section visibility and order</legend>
          <h3 className="font-serif text-lg text-charcoal">Homepage sections</h3>
          <p className="text-xs text-charcoal-muted">Toggle visibility here; use ↑↓ to reorder. (One save applies tick-boxes; arrows change order immediately.)</p>
          <ul className="mt-3 divide-y divide-[#F5EFE3]">
            {homepage.sectionOrder.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                <input type="checkbox" name={`sec_${s.id}`} defaultChecked={s.enabled} className="accent-burgundy" id={`toggle-${s.id}`} />
                <label htmlFor={`toggle-${s.id}`} className="flex-1">{HOMEPAGE_SECTION_LABELS[s.id] ?? s.id}</label>
                <span className="flex gap-1">
                  <button
                    formAction={moveSectionAction}
                    name="payload"
                    value={`${s.id}:up`}
                    className="btn-ghost px-2 py-1 text-xs"
                    aria-label={`Move ${HOMEPAGE_SECTION_LABELS[s.id] ?? s.id} up`}
                  >↑</button>
                  <button
                    formAction={moveSectionAction}
                    name="payload"
                    value={`${s.id}:down`}
                    className="btn-ghost px-2 py-1 text-xs"
                    aria-label={`Move ${HOMEPAGE_SECTION_LABELS[s.id] ?? s.id} down`}
                  >↓</button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-charcoal-muted">Tick-boxes save with the form; arrows reorder instantly.</p>
        </fieldset>

        {/* Footer blurb */}
        <fieldset className="card grid gap-4 p-6">
          <legend className="sr-only">Footer</legend>
          <h3 className="font-serif text-lg text-charcoal">Footer</h3>
          <div>
            <label className="label" htmlFor="footerText">Short footer blurb (brand line appears from Branding settings)</label>
            <input id="footerText" name="footerText" maxLength={200} defaultValue={homepage.footerText} className="input" placeholder="Crafted with care for every celebration." />
          </div>
        </fieldset>

        <button className="btn-burgundy px-6 py-3">Save homepage</button>
      </form>
      <p className="text-xs text-charcoal-muted">
        Section ids managed: {HOMEPAGE_SECTION_IDS.join(", ")}. Current order: {homepage.sectionOrder.map((s) => `${s.id}${orderMap.get(s.id) ? "✓" : "✗"}`).join(" · ")}
      </p>
    </div>
  );
}
