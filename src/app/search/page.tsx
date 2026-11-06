import { Pagination } from "@/components/pagination";
import type { Metadata } from "next";
import { listProducts, PAGE_SIZE, type ProductSort } from "@/lib/db/catalog";
import { ProductGrid } from "@/components/product-card";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", description: "Search invitation videos, websites and cards." };

const KINDS = [
  { id: "", label: "All types" },
  { id: "video", label: "Videos" },
  { id: "website", label: "Websites" },
  { id: "card", label: "Cards" },
  { id: "service", label: "Services" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; kind?: string; sort?: string; min?: string; max?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim().slice(0, 120);
  const kind = KINDS.find((k) => k.id === searchParams.kind)?.id ?? "";
  const sort = (["featured", "new", "price_asc", "price_desc"] as ProductSort[]).find(
    (s) => s === searchParams.sort,
  );
  const min = Number(searchParams.min);
  const max = Number(searchParams.max);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const result =
    q || kind
      ? await listProducts({
          q: q || undefined,
          kind: kind || undefined,
          sort,
          minPrice: Number.isFinite(min) && min > 0 ? min : undefined,
          maxPrice: Number.isFinite(max) && max > 0 ? max : undefined,
          page,
          pageSize: PAGE_SIZE,
        })
      : { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };

  function makeHref(over: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      q: q || undefined,
      kind: kind || undefined,
      sort,
      min: Number.isFinite(min) && min > 0 ? min : undefined,
      max: Number.isFinite(max) && max > 0 ? max : undefined,
      page,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="container-pad py-12 sm:py-16">
      <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">Search invitations</h1>

      <form action="/search" className="mt-6 grid gap-3 rounded-2xl border border-[#E8DFCE] bg-cream p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input type="search" name="q" defaultValue={q} placeholder="e.g. royal tamil, floral, nikah…" className="input" aria-label="Search" />
        <select name="kind" defaultValue={kind} className="input" aria-label="Type">
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.label}</option>
          ))}
        </select>
        <input type="number" name="min" min={0} defaultValue={searchParams.min ?? ""} placeholder="Min ₹" className="input sm:w-28" aria-label="Minimum price" />
        <input type="number" name="max" min={0} defaultValue={searchParams.max ?? ""} placeholder="Max ₹" className="input sm:w-28" aria-label="Maximum price" />
        <button type="submit" className="btn-gold px-5 py-2.5 text-sm">Search</button>
      </form>

      {(q || kind) && (
        <>
          <p className="mt-6 text-sm text-charcoal-muted" role="status">
            {result.total} result{result.total === 1 ? "" : "s"}
            {q ? <> for “<span className="font-medium text-charcoal">{q}</span>”</> : null}
            {kind ? <> in {KINDS.find((k) => k.id === kind)?.label}</> : null}
          </p>
          <div className="mt-6">
            {result.items.length ? (
              <>
                <ProductGrid products={result.items} />
                <Pagination
                  page={page}
                  total={result.total}
                  pageSize={PAGE_SIZE}
                  makeHref={(p) => makeHref({ page: p })}
                />
              </>
            ) : (
              <EmptyState
                title="No matches"
                message="Try a different word, or browse the video, website and card collections."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
