import type { Metadata } from "next";
import Link from "next/link";
import { listFaqs } from "@/lib/db/catalog";
import { EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers about delivery, revisions, payments, customization and privacy.",
};

export default async function FaqsPage() {
  const faqs = await listFaqs();
  const groups = new Map<string, typeof faqs>();
  for (const f of faqs) {
    const key = f.category ?? "general";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return (
    <div className="container-pad max-w-3xl py-14">
      <SectionHeading align="center" eyebrow="Help" title="Frequently asked questions" />
      {faqs.length === 0 ? (
        <EmptyState title="No FAQs yet" message="Questions and answers appear once published by the admin." />
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <section key={category} className="mb-8">
            <h2 className="eyebrow mb-3 capitalize">{category}</h2>
            <div className="space-y-3">
              {items.map((f) => (
                <details key={f.id} className="card px-6 py-4 open:shadow-soft">
                  <summary className="cursor-pointer list-none font-serif text-lg text-charcoal">
                    {f.question}
                    <span className="float-right text-gold">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))
      )}
      <p className="mt-8 text-center text-sm text-charcoal-muted">
        Still curious? <Link href="/contact" className="text-burgundy underline">Contact us</Link>
      </p>
    </div>
  );
}
