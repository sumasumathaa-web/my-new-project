import Link from "next/link";
import { getBranding, getHomepage } from "@/lib/settings";
import {
  getBestSellers,
  getFeaturedProducts,
  getNewArrivals,
  listActiveBanners,
  listFaqs,
  listThemes,
} from "@/lib/db/catalog";
import { ProductGrid } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeading } from "@/components/ui";
import { mediaUrl } from "@/lib/db/storage";

export const dynamic = "force-dynamic";

function sectionEnabled(sectionOrder: { id: string; enabled: boolean }[], id: string): boolean {
  return sectionOrder.find((s) => s.id === id)?.enabled ?? false;
}

export default async function HomePage() {
  const [branding, homepage, featuredVideos, featuredWebsites, cards, themes, newest, bestSellers, banners, faqs] =
    await Promise.all([
      getBranding(),
      getHomepage(),
      getFeaturedProducts("video", 4),
      getFeaturedProducts("website", 4),
      getFeaturedProducts("card", 4),
      listThemes({ featuredOnly: true }),
      getNewArrivals(4),
      getBestSellers(4),
      listActiveBanners(),
      listFaqs(),
    ]);

  const sections = homepage.sectionOrder;
  const heroBanners = banners.filter((b) => b.placement === "hero_strip");
  const lobbyBanners = banners.filter((b) => b.placement === "banner");
  const heroImage = mediaUrl(homepage.heroImagePath);

  const faqBlock = faqs.length ? (
    <section key="faqs" className="section-pad bg-champagne/50">
      <div className="container-pad max-w-3xl">
        <SectionHeading align="center" eyebrow="Good to Know" title="Frequently asked questions" />
        <ul className="space-y-3">
          {faqs.slice(0, 6).map((f) => (
            <li key={f.id}>
              <details className="card group px-6 py-4 open:shadow-soft">
                <summary className="cursor-pointer list-none font-serif text-lg text-charcoal">
                  {f.question}
                  <span className="float-right text-gold transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">{f.answer}</p>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <Link href="/faqs" className="btn-outline">All FAQs</Link>
        </div>
      </div>
    </section>
  ) : null;

  const newsletterBlock = (
    <section key="news" className="section-pad">
      <div className="container-pad max-w-xl text-center">
        <SectionHeading align="center" eyebrow="Stay Inspired" title="Join our letter" />
        <p className="mb-6 text-sm text-charcoal-muted">
          New designs, real wedding inspiration and festive offers — occasionally, never spammy.
        </p>
        <NewsletterForm />
      </div>
    </section>
  );

  const blocks: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className="paper relative overflow-hidden border-b border-[#E8DFCE]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(176,141,87,0.20), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(110,30,44,0.10), transparent 65%)" }}
        />
        <div className="container-pad relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="fade-up">
            <p className="eyebrow mb-5 flex items-center gap-3">
              <span aria-hidden className="inline-block h-px w-8 bg-gold/60" />
              {branding.tagline}
            </p>
            <h1 className="display-xl text-balance font-serif text-charcoal">
              {homepage.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-charcoal-muted sm:text-lg">
              {homepage.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={homepage.heroCtaUrl || "/invitation-videos"} className="btn-gold px-7 py-3.5">
                {homepage.heroCtaLabel || "Browse"}
              </Link>
              <Link href={homepage.heroCta2Url || "/contact"} className="btn-outline px-7 py-3.5">
                {homepage.heroCta2Label || "Learn more"}
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-[#E8DFCE] pt-6">
              {[
                { k: "48 hrs", v: "First draft" },
                { k: "2 included", v: "Revisions" },
                { k: "100%", v: "Original design" },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="font-serif text-lg text-burgundy">{item.k}</dt>
                  <dd className="text-xs uppercase tracking-widest2 text-charcoal-muted">{item.v}</dd>
                </div>
              ))}
            </dl>
            {heroBanners[0] ? (
              <p className="mt-8 inline-flex flex-wrap items-center gap-2 rounded-full border border-gold-light bg-cream/80 px-4 py-2 text-sm text-burgundy">
                <span aria-hidden className="text-gold">✦</span>
                <strong className="font-medium">{heroBanners[0].title}</strong>
                <span className="text-charcoal-muted">{heroBanners[0].subtitle}</span>
              </p>
            ) : null}
          </div>

          <div className="relative fade-up fade-up-2">
            <div
              aria-hidden
              className="absolute inset-x-6 -bottom-4 top-10 rounded-[14rem_14rem_2rem_2rem] border border-gold/25"
            />
            <div className="clip-arch relative overflow-hidden border border-[#E8DFCE] bg-champagne shadow-soft">
              {homepage.heroVideoUrl ? (
                <video className="h-full w-full object-cover" src={homepage.heroVideoUrl} autoPlay muted loop playsInline />
              ) : heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt="Featured wedding invitation" className="h-full w-full object-cover" />
              ) : (
                <svg viewBox="0 0 500 620" className="h-auto w-full" role="img" aria-label="Elegant invitation artwork">
                  <defs>
                    <linearGradient id="heroCard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F7EFDF" />
                      <stop offset="100%" stopColor="#EFE3CD" />
                    </linearGradient>
                  </defs>
                  <rect width="500" height="620" fill="url(#heroCard)" />
                  <circle cx="250" cy="268" r="158" fill="none" stroke="#B08D57" strokeWidth="1" strokeOpacity="0.55" />
                  <circle cx="250" cy="268" r="132" fill="none" stroke="#B08D57" strokeWidth="1.6" />
                  <circle cx="250" cy="268" r="98" fill="none" stroke="#6E1E2C" strokeWidth="0.8" strokeOpacity="0.35" />
                  <text x="250" y="196" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#8F6F42" letterSpacing="6">
                    TOGETHER WITH FAMILIES
                  </text>
                  <text x="250" y="262" textAnchor="middle" fontFamily="Georgia, serif" fontSize="46" fill="#6E1E2C">
                    Ananya
                  </text>
                  <text x="250" y="302" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#B08D57">
                    &amp;
                  </text>
                  <text x="250" y="348" textAnchor="middle" fontFamily="Georgia, serif" fontSize="46" fill="#6E1E2C">
                    Arjun
                  </text>
                  <line x1="150" y1="382" x2="350" y2="382" stroke="#B08D57" strokeOpacity="0.5" />
                  <text x="250" y="418" textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fill="#571622" letterSpacing="3">
                    14 · 02 · 2027
                  </text>
                  <text x="250" y="446" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#7A7066" letterSpacing="5">
                    MADURAI
                  </text>
                  <text x="250" y="540" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill="#9C8A6B" letterSpacing="4">
                    {branding.businessName.toUpperCase()}
                  </text>
                </svg>
              )}
            </div>
            <div className="float-soft absolute -left-3 bottom-8 hidden rounded-2xl border border-[#E8DFCE] bg-cream/95 px-4 py-3 shadow-card sm:block">
              <p className="text-[10px] uppercase tracking-widest2 text-charcoal-muted">Delivered digitally</p>
              <p className="font-serif text-lg text-burgundy">Ready in 48 hours</p>
            </div>
          </div>
        </div>
      </section>
    ),

    featured_videos: featuredVideos.length ? (
      <section key="fv" className="section-pad">
        <div className="container-pad">
          <SectionHeading
            eyebrow="Invitation Films"
            title="Featured wedding videos"
            subtitle="Cinematic, traditional and everything in between — each one personalised to your names, dates and story."
          />
          <ProductGrid products={featuredVideos} />
          <div className="mt-8 text-center">
            <Link href="/invitation-videos" className="btn-outline">View all videos</Link>
          </div>
        </div>
      </section>
    ) : null,

    featured_websites: featuredWebsites.length ? (
      <section key="fw" className="section-pad bg-champagne/50">
        <div className="container-pad">
          <SectionHeading
            eyebrow="Invitation Websites"
            title="Featured wedding websites"
            subtitle="Your own elegant link with events, gallery, venue maps and RSVP."
          />
          <ProductGrid products={featuredWebsites} />
          <div className="mt-8 text-center">
            <Link href="/invitation-websites" className="btn-outline">View all websites</Link>
          </div>
        </div>
      </section>
    ) : null,

    digital_cards: cards.length ? (
      <section key="dc" className="section-pad">
        <div className="container-pad">
          <SectionHeading eyebrow="Digital Cards" title="Elegant digital wedding cards" />
          <ProductGrid products={cards} />
          <div className="mt-8 text-center">
            <Link href="/digital-cards" className="btn-outline">View all cards</Link>
          </div>
        </div>
      </section>
    ) : null,

    trending_themes: themes.length ? (
      <section key="tt" className="section-pad bg-champagne/50">
        <div className="container-pad">
          <SectionHeading eyebrow="Themes" title="Trending themes" subtitle="Curated palettes for your invitation." />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {themes.slice(0, 8).map((t) => {
              const cfg = (t.config ?? {}) as { bg?: string; accent?: string; font?: string };
              return (
                <Link
                  key={t.id}
                  href={`/themes#${t.slug}`}
                  className="card overflow-hidden transition hover:shadow-soft"
                >
                  <div className="aspect-[4/3]" style={{ background: cfg.bg ?? "#F3EAD9" }}>
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                      <span className="font-serif text-lg" style={{ color: cfg.accent ?? "#B08D57" }}>
                        {t.name}
                      </span>
                      <span className="h-px w-10" style={{ background: cfg.accent ?? "#B08D57" }} />
                      <span className="text-[11px] uppercase tracking-widest text-charcoal-muted">
                        {t.tags.join(" · ")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    ) : null,

    new_arrivals: newest.length ? (
      <section key="na" className="section-pad">
        <div className="container-pad">
          <SectionHeading eyebrow="Just In" title="New arrivals" />
          <ProductGrid products={newest} />
        </div>
      </section>
    ) : null,

    best_sellers: bestSellers.length ? (
      <section key="bs" className="section-pad bg-champagne/50">
        <div className="container-pad">
          <SectionHeading
            eyebrow="Loved by Couples"
            title="Best sellers"
            subtitle="Ranked from actual completed orders."
          />
          <ProductGrid products={bestSellers.map((b) => b.product)} />
        </div>
      </section>
    ) : null,

    offers: lobbyBanners.length ? (
      <section key="offers" className="section-pad">
        <div className="container-pad grid gap-5 md:grid-cols-2">
          {lobbyBanners.map((b) => (
            <Link
              key={b.id}
              href={b.cta_url ?? "/offers"}
              className="card flex items-center justify-between gap-4 p-6 transition hover:shadow-soft"
            >
              <div>
                <p className="font-serif text-xl text-charcoal">{b.title}</p>
                {b.subtitle ? <p className="mt-1 text-sm text-charcoal-muted">{b.subtitle}</p> : null}
                {b.coupon_code ? (
                  <p className="mt-2 text-xs uppercase tracking-widest text-burgundy">Code: {b.coupon_code}</p>
                ) : null}
              </div>
              <span className="btn-gold shrink-0 px-4 py-2 text-xs">{b.cta_label ?? "View"}</span>
            </Link>
          ))}
        </div>
      </section>
    ) : null,

    custom_services: (
      <section key="cs" className="section-pad border-y border-[#E8DFCE] bg-[#241F1B] text-[#EDE4D2]">
        <div className="container-pad grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Bespoke</p>
            <h2 className="font-serif text-3xl sm:text-4xl" style={{ color: "#F3EAD9" }}>
              Dreaming of something one-of-a-kind?
            </h2>
            <p className="mt-4 max-w-lg text-[#C9BBA3]">
              Our designers craft fully custom invitation videos, websites and cards — around your story, outfit
              palette and traditions.
            </p>
            <Link href="/custom-design" className="btn-gold mt-6">Start a custom brief</Link>
          </div>
        </div>
      </section>
    ),

    how_it_works: (
      <section key="hiw" className="section-pad">
        <div className="container-pad">
          <SectionHeading align="center" eyebrow="Simple & Swift" title="How it works" />
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              { n: "01", t: "Choose & order", d: "Pick a design you love and place your order securely with Razorpay." },
              { n: "02", t: "Personalise", d: "Share your names, dates, venue and photos through your account dashboard." },
              { n: "03", t: "Receive & share", d: "Get your video, card or live website link — ready for WhatsApp and beyond." },
            ].map((s) => (
              <li key={s.n} className="card p-7 text-center">
                <p className="font-serif text-3xl text-gold">{s.n}</p>
                <h3 className="mt-3 font-serif text-xl text-charcoal">{s.t}</h3>
                <p className="mt-2 text-sm text-charcoal-muted">{s.d}</p>
              </li>
            ))}
          </ol>
          {/* Testimonials appear here automatically when genuine customer reviews exist. */}
        </div>
      </section>
    ),

    faqs: faqBlock,

    newsletter: newsletterBlock,
  };

  return (
    <>
      {homepage.sectionOrder
        .filter((s) => sectionEnabled(sections, s.id))
        .map((s) => blocks[s.id] ?? null)}
      {branding.whatsapp ? (
        <a
          href={`https://wa.me/${branding.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'm interested in a wedding invitation.")}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2F6B38] p-3.5 text-cream shadow-soft transition hover:brightness-110"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.2.3-.1.5s.8 1.3 1.7 2.1c1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.4Z" />
          </svg>
        </a>
      ) : null}
    </>
  );
}
