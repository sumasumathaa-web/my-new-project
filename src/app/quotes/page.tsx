import type { Metadata } from "next";
import Link from "next/link";
import { listQuotes } from "@/lib/db/catalog";
import { EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Invitation Quotes & Wording",
  description:
    "Beautiful wedding quotes and invitation wording in English and Tamil — ready to use in your invitations.",
};

const TABS = [
  { id: "", label: "All" },
  { id: "wedding", label: "Wedding" },
  { id: "love", label: "Love" },
  { id: "tamil", label: "Tamil" },
  { id: "english", label: "English" },
  { id: "wording", label: "Wording" },
];

export default async function QuotesPage({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = searchParams.cat ?? "";
  const quotes = await listQuotes(cat || undefined);
  return (
    <div className="container-pad py-12 sm:py-16">
      <SectionHeading
        eyebrow="Words that Wed"
        title="Invitation quotes & wording"
        subtitle="Use these lines on your card, video or wedding website — or ask us for custom wording."
      />
      <nav aria-label="Quote categories" className="mb-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id ? `/quotes?cat=${t.id}` : "/quotes"}
            className={`rounded-full px-4 py-1.5 text-xs transition ${
              cat === t.id ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft hover:bg-gold-light/50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {quotes.length === 0 ? (
        <EmptyState title="No quotes in this category yet" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q) => (
            <blockquote key={q.id} className="card flex flex-col p-6">
              <span className="font-serif text-4xl leading-none text-gold">“</span>
              <p className="mt-2 flex-1 font-serif text-lg leading-relaxed text-charcoal">{q.text}</p>
              {q.text_ta && q.category !== "tamil" ? (
                <p lang="ta" className="mt-3 border-t border-[#EFE7D6] pt-3 text-sm text-charcoal-soft">
                  {q.text_ta}
                </p>
              ) : null}
              <footer className="mt-4 text-xs uppercase tracking-widest text-charcoal-muted">
                {q.author ?? "Traditional"}
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
