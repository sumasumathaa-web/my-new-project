import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProducts } from "@/lib/db/catalog";
import { createDraftCustomizationAction } from "../../actions";
import { formatINR, effectivePriceRupees } from "@/lib/money";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New invitation draft", robots: { index: false } };

export default async function NewCustomizationPage() {
  await requireUser("/account/customizations/new");
  const { items } = await listProducts({ pageSize: 100 });
  const customizable = items.filter((p) => p.customization_enabled && p.customization_schema?.length > 0);

  return (
    <div>
      <h1 className="font-serif text-3xl text-charcoal">Start a new invitation</h1>
      <p className="mt-2 text-sm text-charcoal-muted">
        Pick a customizable template. Saving drafts is free; publishing goes live once the template is purchased.
      </p>
      {customizable.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No customizable templates published yet"
            message="Customizable products will appear here."
            action={<Link href="/invitation-websites" className="btn-gold">Browse websites</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {customizable.map((p) => (
            <li key={p.id} className="card flex flex-col p-5">
              <p className="text-xs uppercase tracking-widest text-charcoal-muted">{p.kind}</p>
              <h2 className="mt-1 font-serif text-lg text-charcoal">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-charcoal-muted">{p.description}</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="font-serif text-lg text-burgundy">{formatINR(effectivePriceRupees(p))}</span>
                <form action={createDraftCustomizationAction}>
                  <input type="hidden" name="product_id" value={p.id} />
                  <button type="submit" className="btn-gold px-4 py-2 text-xs">Open in editor</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
