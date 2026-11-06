import { Pagination } from "@/components/pagination";
import Link from "next/link";
import type { Metadata } from "next";
import { listCategories, listProducts, PAGE_SIZE, type ProductSort } from "@/lib/db/catalog";
import { ProductGrid } from "@/components/product-card";
import { EmptyState } from "@/components/ui";

export interface CategoryLandingProps {
  title: string;
  eyebrow: string;
  description: string;
  basePath: string;
  kind?: string;
  categorySlug?: string; // fixed category for engagement/reception/save-the-date
}

const SORTS: { id: ProductSort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "new", label: "Newest" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
];

export async function renderCategoryLanding(
  props: CategoryLandingProps,
  searchParams: { page?: string; sort?: string; cat?: string },
) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const sort = (SORTS.find((s) => s.id === searchParams.sort)?.id ?? "featured") as ProductSort;
  const cat = searchParams.cat || undefined;

  const [chips, result] = await Promise.all([
    props.kind && !props.categorySlug ? listCategories({ kind: props.kind }) : Promise.resolve([]),
    listProducts({
      kind: props.kind,
      categorySlug: cat ?? props.categorySlug,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  function makeHref(over: { page?: number; sort?: string; cat?: string | null }) {
    const params = new URLSearchParams();
    const nextSort = over.sort ?? sort;
    const nextCat = over.cat === undefined ? cat : over.cat ?? undefined;
    if (nextSort !== "featured") params.set("sort", nextSort);
    if (nextCat) params.set("cat", nextCat);
    const p = over.page ?? page;
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${props.basePath}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="container-pad py-12 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="eyebrow mb-2">{props.eyebrow}</p>
        <h1 className="font-serif text-3xl text-charcoal sm:text-4xl lg:text-5xl">{props.title}</h1>
        <p className="mt-4 text-charcoal-muted">{props.description}</p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {chips.length ? (
          <nav aria-label="Subcategories" className="flex flex-wrap gap-2">
            <Link
              href={props.basePath}
              className={`rounded-full px-4 py-1.5 text-xs transition ${!cat ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft hover:bg-gold-light/50"}`}
            >
              All
            </Link>
            {chips.map((c) => (
              <Link
                key={c.id}
                href={`${props.basePath}?cat=${c.slug}`}
                className={`rounded-full px-4 py-1.5 text-xs transition ${cat === c.slug ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft hover:bg-gold-light/50"}`}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-charcoal-muted">Sort:</span>
          {SORTS.map((s) => (
            <Link
              key={s.id}
              href={makeHref({ sort: s.id, page: 1 })}
              className={`rounded-full px-3 py-1.5 ${sort === s.id ? "bg-burgundy/10 font-semibold text-burgundy" : "text-charcoal-soft hover:bg-champagne"}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {result.items.length ? (
        <>
          <ProductGrid products={result.items} />
          <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} makeHref={(p) => makeHref({ page: p })} />
          <p className="mt-4 text-center text-xs text-charcoal-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total}
          </p>
        </>
      ) : (
        <EmptyState
          title="Nothing here yet"
          message="New designs are being added. Check back soon or ask us for something custom."
          action={<Link href="/contact" className="btn-gold">Request a custom design</Link>}
        />
      )}
    </div>
  );
}

export function categoryMeta(props: CategoryLandingProps): Metadata {
  return { title: props.title, description: props.description };
}
