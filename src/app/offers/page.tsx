import type { Metadata } from "next";
import { listActiveBanners } from "@/lib/db/catalog";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { EmptyState, SectionHeading, Badge } from "@/components/ui";
import { formatINR } from "@/lib/money";
import type { Coupon } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Offers & Discounts", description: "Current offers and coupon codes." };

export default async function OffersPage() {
  const banners = await listActiveBanners();
  const sb = safeServiceSupabase();
  const now = new Date().toISOString();
  const { data: couponsData } = sb
    ? await sb.from("coupons").select("*").eq("is_active", true).order("created_at", { ascending: false })
    : { data: [] };
  const coupons = ((couponsData ?? []) as Coupon[]).filter((c) => {
    if (c.starts_at && c.starts_at > now) return false;
    if (c.expires_at && c.expires_at < now) return false;
    return true;
  });

  return (
    <div className="container-pad py-12 sm:py-16">
      <SectionHeading eyebrow="Save Gracefully" title="Offers & discounts" subtitle="Apply these codes at checkout." />
      {banners.length === 0 && coupons.length === 0 ? (
        <EmptyState title="No active offers" message="Check back during the festive season ✦" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {coupons.map((c) => (
            <div key={c.id} className="card border-dashed p-6">
              <div className="flex items-center justify-between">
                <code className="rounded-lg bg-champagne px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-burgundy">
                  {c.code}
                </code>
                <Badge tone="gold">
                  {c.kind === "percent" ? `${Number(c.value)}% off` : `${formatINR(Number(c.value))} off`}
                </Badge>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-charcoal-muted">
                <li>{c.description ?? "Special offer"}</li>
                {Number(c.min_purchase) > 0 ? <li>Minimum order {formatINR(Number(c.min_purchase))}</li> : null}
                {c.kind === "percent" && c.max_discount ? (
                  <li>Maximum discount {formatINR(Number(c.max_discount))}</li>
                ) : null}
                {c.first_order_only ? <li>Valid on your first order only</li> : null}
                {c.expires_at ? <li>Valid until {new Date(c.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</li> : null}
              </ul>
            </div>
          ))}
          {banners
            .filter((b) => !coupons.some((c) => c.code === b.coupon_code))
            .map((b) => (
              <div key={b.id} className="card p-6">
                <p className="font-serif text-xl text-charcoal">{b.title}</p>
                {b.subtitle ? <p className="mt-1 text-sm text-charcoal-muted">{b.subtitle}</p> : null}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
