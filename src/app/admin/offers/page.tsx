import { safeServiceSupabase } from "@/lib/supabase/admin";
import { couponUsageReport } from "@/lib/db/coupons";
import { deleteBannerAction, deleteCouponAction, upsertBannerAction, upsertCouponAction } from "../actions-catalog";
import { Badge, ConfirmSubmitButton } from "@/components/ui";
import { formatINR } from "@/lib/money";
import type { Coupon, OfferBanner } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "coupons", label: "Coupons" },
  { id: "banners", label: "Promo banners" },
  { id: "usage", label: "Usage report" },
];

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: { tab?: string; saved?: string; deleted?: string; error?: string; edit?: string };
}) {
  const tab = TABS.find((t) => t.id === searchParams.tab)?.id ?? "coupons";
  const sb = safeServiceSupabase();
  const [couponsRes, bannersRes, usage] = sb
    ? await Promise.all([
        tab !== "usage" ? sb.from("coupons").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        tab === "banners" ? sb.from("offer_banners").select("*").order("sort_order") : Promise.resolve({ data: [] }),
        tab === "usage" ? couponUsageReport() : Promise.resolve([]),
      ])
    : [{ data: [] }, { data: [] }, []];
  const coupons = (couponsRes.data ?? []) as Coupon[];
  const banners = (bannersRes.data ?? []) as OfferBanner[];
  const editCoupon = coupons.find((c) => c.id === searchParams.edit) ?? null;
  const editBanner = banners.find((b) => b.id === searchParams.edit) ?? null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Offers & coupons</h2>
      <nav className="flex flex-wrap gap-2" aria-label="Offer tabs">
        {TABS.map((t) => (
          <a key={t.id} href={`/admin/offers?tab=${t.id}`} className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}>{t.label}</a>
        ))}
      </nav>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : null}

      {tab === "coupons" ? (
        <>
          <form action={upsertCouponAction} className="card grid gap-4 p-5">
            {editCoupon ? <input type="hidden" name="id" value={editCoupon.id} /> : null}
            <h3 className="font-serif text-lg">{editCoupon ? `Edit ${editCoupon.code}` : "New coupon"}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="c-code">Code *</label>
                <input id="c-code" name="code" required maxLength={40} defaultValue={editCoupon?.code ?? ""} className="input font-mono uppercase" placeholder="WELCOME10" />
              </div>
              <div>
                <label className="label" htmlFor="c-kind">Type</label>
                <select id="c-kind" name="kind" defaultValue={editCoupon?.kind ?? "percent"} className="input">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="c-value">Value *</label>
                <input id="c-value" name="value" type="number" step="0.01" min="0.01" required defaultValue={editCoupon?.value ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="c-min">Minimum purchase (₹)</label>
                <input id="c-min" name="min_purchase" type="number" step="0.01" min="0" defaultValue={editCoupon?.min_purchase ?? 0} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="c-max">Max discount (₹, percent only)</label>
                <input id="c-max" name="max_discount" type="number" step="0.01" min="0" defaultValue={editCoupon?.max_discount ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="c-start">Starts (ISO)</label>
                <input id="c-start" name="starts_at" type="datetime-local" defaultValue={editCoupon?.starts_at?.slice(0, 16) ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="c-exp">Expires (ISO)</label>
                <input id="c-exp" name="expires_at" type="datetime-local" defaultValue={editCoupon?.expires_at?.slice(0, 16) ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="c-limit">Total usage limit</label>
                <input id="c-limit" name="usage_limit" type="number" min="1" defaultValue={editCoupon?.usage_limit ?? ""} className="input" placeholder="blank = unlimited" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <label className="flex items-center gap-2">Per-user limit <input name="per_user_limit" type="number" min={1} defaultValue={editCoupon?.per_user_limit ?? 1} className="input w-20" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" name="first_order_only" defaultChecked={editCoupon?.first_order_only ?? false} className="accent-burgundy" /> First order only</label>
              <label className="flex items-center gap-2">Applies to
                <select name="applies_to" defaultValue={editCoupon?.applies_to ?? "all"} className="input w-32">
                  <option value="all">Everything</option>
                  <option value="product">Specific products</option>
                  <option value="category">Specific categories</option>
                </select>
              </label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={editCoupon?.is_active ?? true} className="accent-burgundy" /> Active</label>
            </div>
            <div>
              <label className="label" htmlFor="c-desc">Description (shown on offers page)</label>
              <input id="c-desc" name="description" maxLength={300} defaultValue={editCoupon?.description ?? ""} className="input" />
            </div>
            <div>
              <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editCoupon ? "Save coupon" : "Create coupon"}</button>
              {editCoupon ? <a href="/admin/offers?tab=coupons" className="btn-ghost ml-2 px-3 py-2 text-sm">Cancel</a> : null}
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                  <th className="p-3">Code</th><th className="p-3">Value</th><th className="p-3">Rules</th><th className="p-3">Window</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-[#F5EFE3] last:border-0">
                    <td className="p-3 font-mono font-semibold">{c.code}</td>
                    <td className="p-3">{c.kind === "percent" ? `${Number(c.value)}%` : formatINR(Number(c.value))}{c.max_discount ? ` (max ${formatINR(Number(c.max_discount))})` : ""}</td>
                    <td className="p-3 text-xs text-charcoal-muted">
                      min {formatINR(Number(c.min_purchase))} · per-user {c.per_user_limit}
                      {c.first_order_only ? " · first order" : ""} · {c.applies_to}
                    </td>
                    <td className="p-3 text-xs">{c.starts_at ? new Date(c.starts_at).toLocaleDateString("en-IN") : "—"} → {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "∞"}</td>
                    <td className="p-3"><Badge tone={c.is_active ? "green" : "gray"}>{c.is_active ? "active" : "disabled"}</Badge></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <a href={`/admin/offers?tab=coupons&edit=${c.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                        <form>
                          <ConfirmSubmitButton label="Delete" confirmText={`Delete coupon ${c.code}?`} className="btn-ghost px-2 py-1 text-xs text-burgundy" name="id" value={c.id} formAction={deleteCouponAction} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "banners" ? (
        <>
          <form action={upsertBannerAction} className="card grid gap-4 p-5">
            {editBanner ? <input type="hidden" name="id" value={editBanner.id} /> : null}
            <h3 className="font-serif text-lg">{editBanner ? "Edit banner" : "New promo banner"}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label" htmlFor="b-title">Title *</label>
                <input id="b-title" name="title" required maxLength={200} defaultValue={editBanner?.title ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-sub">Subtitle</label>
                <input id="b-sub" name="subtitle" maxLength={300} defaultValue={editBanner?.subtitle ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-place">Placement</label>
                <select id="b-place" name="placement" defaultValue={editBanner?.placement ?? "banner"} className="input">
                  <option value="announcement">Top announcement bar</option>
                  <option value="hero_strip">Hero strip</option>
                  <option value="banner">Offers section card</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="b-cta">CTA label</label>
                <input id="b-cta" name="cta_label" maxLength={60} defaultValue={editBanner?.cta_label ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-url">CTA URL</label>
                <input id="b-url" name="cta_url" maxLength={300} defaultValue={editBanner?.cta_url ?? ""} className="input" placeholder="/offers" />
              </div>
              <div>
                <label className="label" htmlFor="b-coupon">Coupon code (optional)</label>
                <input id="b-coupon" name="coupon_code" maxLength={40} defaultValue={editBanner?.coupon_code ?? ""} className="input font-mono" />
              </div>
              <div>
                <label className="label" htmlFor="b-start">Starts</label>
                <input id="b-start" name="starts_at" type="datetime-local" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-exp">Expires</label>
                <input id="b-exp" name="expires_at" type="datetime-local" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-sort">Sort</label>
                <input id="b-sort" name="sort_order" type="number" defaultValue={editBanner?.sort_order ?? 0} className="input" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={editBanner?.is_active ?? true} className="accent-burgundy" /> Active</label>
            <div>
              <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editBanner ? "Save banner" : "Create banner"}</button>
              {editBanner ? <a href="/admin/offers?tab=banners" className="btn-ghost ml-2 px-3 py-2 text-sm">Cancel</a> : null}
            </div>
          </form>
          <ul className="space-y-3">
            {banners.map((b) => (
              <li key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-charcoal-muted">{b.subtitle} · {b.placement}{b.coupon_code ? ` · code ${b.coupon_code}` : ""}</p>
                </div>
                <Badge tone={b.is_active ? "green" : "gray"}>{b.is_active ? "active" : "off"}</Badge>
                <a href={`/admin/offers?tab=banners&edit=${b.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                <form>
                  <ConfirmSubmitButton label="Delete" confirmText="Delete this banner?" className="btn-ghost px-2 py-1 text-xs text-burgundy" name="id" value={b.id} formAction={deleteBannerAction} />
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "usage" ? (
        <div className="card overflow-x-auto p-5">
          <h3 className="font-serif text-lg">Coupon usage</h3>
          <table className="mt-4 w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="p-2">Code</th><th className="p-2">Value</th><th className="p-2">Times used</th><th className="p-2">Total discount given</th><th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(usage as Awaited<ReturnType<typeof couponUsageReport>>).map((u) => (
                <tr key={u.id} className="border-b border-[#F5EFE3] last:border-0">
                  <td className="p-2 font-mono font-semibold">{u.code}</td>
                  <td className="p-2">{u.kind === "percent" ? `${u.value}%` : formatINR(u.value)}</td>
                  <td className="p-2">{u.uses}</td>
                  <td className="p-2">{formatINR(u.totalDiscount)}</td>
                  <td className="p-2"><Badge tone={u.is_active ? "green" : "gray"}>{u.is_active ? "active" : "disabled"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
