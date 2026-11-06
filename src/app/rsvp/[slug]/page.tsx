import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCustomization } from "@/lib/db/customizations";
import { getBranding } from "@/lib/settings";
import { RsvpForm } from "@/components/rsvp-form";

export const dynamic = "force-dynamic";

function namesFrom(config: Record<string, unknown>): { a: string; b: string } {
  const v = (k: string) => {
    const s = config[k];
    return typeof s === "string" && s.trim().length ? s.trim() : null;
  };
  return {
    a: v("partner_a") ?? v("bride_name") ?? v("name_a") ?? "The couple",
    b: v("partner_b") ?? v("groom_name") ?? v("name_b") ?? "",
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const customization = await getPublishedCustomization(params.slug);
  if (!customization) return { title: "RSVP" };
  const { a, b } = namesFrom(customization.config);
  return {
    title: `RSVP — ${a}${b ? ` & ${b}` : ""}`,
    robots: { index: false },
  };
}

/** Standalone RSVP page (shareable short link). The full invitation lives at /w/[slug]. */
export default async function RsvpPage({ params }: { params: { slug: string } }) {
  const customization = await getPublishedCustomization(params.slug);
  if (!customization) notFound();
  const branding = await getBranding();
  const { a, b } = namesFrom(customization.config);
  const dates = customization.config.wedding_date;

  return (
    <div className="container-pad flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg space-y-6 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-charcoal-muted">You're invited</p>
        <h1 className="font-serif text-3xl text-charcoal">
          {a}
          {b ? <span className="text-gold"> &amp; {b}</span> : null}
        </h1>
        {typeof dates === "string" && dates ? (
          <p className="text-sm text-charcoal-muted">
            {new Date(dates).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        ) : null}
        <RsvpForm slug={customization.slug} accent={branding.accentColor} />
        <p className="text-xs text-charcoal-muted">
          <Link href={`/w/${customization.slug}`} className="underline underline-offset-2">View the full invitation ↗</Link>
        </p>
      </div>
    </div>
  );
}
