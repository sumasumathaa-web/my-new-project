import type { Metadata } from "next";
import Link from "next/link";
import { listThemes } from "@/lib/db/catalog";
import { EmptyState, SectionHeading } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { mediaUrl } from "@/lib/db/storage";
import { ProductArt } from "@/components/product-art";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Wedding Themes",
  description: "Curated colour palettes and design themes for wedding invitation videos, websites and cards.",
};

export default async function ThemesPage() {
  const themes = await listThemes();
  return (
    <div className="container-pad py-12 sm:py-16">
      <SectionHeading
        eyebrow="Design Library"
        title="Wedding themes"
        subtitle="Every theme can be applied to website templates and digital cards. Prices shown are theme-specific when configured."
      />
      {themes.length === 0 ? (
        <EmptyState title="No themes yet" message="Themes will appear once published from the admin dashboard." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => {
            const cfg = (t.config ?? {}) as { bg?: string; accent?: string; font?: string };
            const img = mediaUrl(t.preview_image_path);
            return (
              <article key={t.id} id={t.slug} className="card overflow-hidden">
                <div className="aspect-[4/3]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full flex-col items-center justify-center gap-3"
                      style={{ background: cfg.bg ?? "#F3EAD9" }}
                    >
                      <p className="eyebrow" style={{ color: cfg.accent ?? "#B08D57" }}>
                        Theme
                      </p>
                      <p
                        className={cfg.font === "sans" ? "font-sans text-2xl" : "font-serif text-2xl"}
                        style={{ color: cfg.accent ?? "#2B2622" }}
                      >
                        {t.name}
                      </p>
                      <span className="h-px w-16" style={{ background: cfg.accent ?? "#B08D57" }} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-charcoal">{t.name}</h3>
                  {t.description ? <p className="mt-1 text-sm text-charcoal-muted">{t.description}</p> : null}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-burgundy">
                      {t.price !== null && t.price !== undefined ? formatINR(t.price) : "Included with templates"}
                    </span>
                    {t.demo_url ? (
                      <a href={t.demo_url} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                        Live demo
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-10 text-center">
        <Link href="/invitation-websites" className="btn-gold">Browse website templates</Link>
      </div>
    </div>
  );
}
