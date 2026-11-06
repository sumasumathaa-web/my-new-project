import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/db/catalog";
import { ProductGrid } from "@/components/product-card";
import { SectionHeading } from "@/components/ui";
import { getBranding } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Custom Design Services",
  description: "Bespoke wedding invitation videos, websites and cards designed one-on-one with our studio.",
};

export default async function CustomDesignPage() {
  const [services, branding] = await Promise.all([listProducts({ kind: "service", pageSize: 12 }), getBranding()]);
  return (
    <div className="container-pad py-12 sm:py-16">
      <SectionHeading
        eyebrow="One-on-One"
        title="Custom design services"
        subtitle="Tell us your story, palette and traditions — we design an invitation that is unmistakably yours."
      />

      <ol className="mb-12 grid gap-5 sm:grid-cols-3">
        {[
          { n: "01", t: "Brief", d: "Share references, colours, languages and must-haves." },
          { n: "02", t: "Design", d: "Our designers craft your invite and share previews for feedback." },
          { n: "03", t: "Refine & receive", d: "Structured revisions until it feels just right." },
        ].map((s) => (
          <li key={s.n} className="card p-6">
            <p className="font-serif text-2xl text-gold">{s.n}</p>
            <h3 className="mt-2 font-serif text-lg text-charcoal">{s.t}</h3>
            <p className="mt-1 text-sm text-charcoal-muted">{s.d}</p>
          </li>
        ))}
      </ol>

      {services.items.length ? (
        <>
          <h2 className="mb-6 font-serif text-2xl text-charcoal">Custom packages</h2>
          <ProductGrid products={services.items} />
        </>
      ) : null}

      <div className="card mt-12 flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="font-serif text-2xl text-charcoal">Have something unique in mind?</h2>
        <p className="max-w-md text-sm text-charcoal-muted">
          Message us{branding.whatsapp ? " on WhatsApp" : ""} and we will plan it together.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contact?subject=Custom%20design" className="btn-gold">Contact the studio</Link>
          {branding.whatsapp ? (
            <a
              className="btn-outline"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${branding.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'd like a custom wedding invitation.")}`}
            >
              WhatsApp us
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
