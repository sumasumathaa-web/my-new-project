import { getContentPage } from "@/lib/db/catalog";
import { renderMarkdown } from "@/lib/markdown-lite";
import { notFound } from "next/navigation";

/** Renders an admin-editable content page (policies, about...). */
export async function LegalPage({ slug }: { slug: string }) {
  const page = await getContentPage(slug);
  if (!page) notFound();
  return (
    <div className="container-pad max-w-3xl py-14">
      <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">{page.title}</h1>
      <p className="mt-2 text-xs text-charcoal-muted">
        Last updated {new Date(page.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
      </p>
      <article
        className="mt-8 rounded-2xl border border-[#E8DFCE] bg-cream p-6 sm:p-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body_md) }}
      />
      <p className="mt-6 text-xs italic text-charcoal-muted">
        This policy text is editable by the business owner from the admin dashboard (Content Pages). The owner is
        responsible for reviewing it against their actual operations and applicable laws.
      </p>
    </div>
  );
}
