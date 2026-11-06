import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { listProducts, PAGE_SIZE } from "@/lib/db/catalog";
import { bulkProductAction, deleteProductAction, duplicateProductAction } from "../actions-catalog";
import { formatINR } from "@/lib/money";
import { Badge, ConfirmSubmitButton, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  video: "Video", website: "Website", card: "Card", quote: "Quote", service: "Service", other: "Other",
};

const STATUS_TONE: Record<string, "green" | "amber" | "gray" | "red"> = {
  published: "green", draft: "amber", archived: "gray", unavailable: "red",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; kind?: string; status?: string; page?: string; saved?: string; deleted?: string; error?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const includeAll = true;
  const result = await listProducts({
    q: searchParams.q || undefined,
    kind: searchParams.kind || undefined,
    page,
    pageSize: 15,
    includeUnpublished: includeAll,
    sort: "new",
  });
  const items =
    searchParams.status && searchParams.status !== "all"
      ? result.items.filter((p) => p.status === searchParams.status)
      : result.items;

  const flash = searchParams.error ? (
    <p className="mb-4 rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
  ) : searchParams.saved ? (
    <p className="mb-4 rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved successfully.</p>
  ) : searchParams.deleted ? (
    <p className="mb-4 rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Deleted.</p>
  ) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-2xl text-charcoal">Products</h2>
        <span className="text-xs text-charcoal-muted">{result.total} total</span>
        <Link href="/admin/products/new" className="btn-burgundy ml-auto px-4 py-2 text-xs">+ New product</Link>
      </div>
      {flash}

      <form action="/admin/products" className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name/description…" className="input max-w-xs" aria-label="Search products" />
        <select name="kind" defaultValue={searchParams.kind ?? ""} className="input w-36" aria-label="Kind">
          <option value="">All kinds</option>
          {Object.entries(KIND_LABEL).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <select name="status" defaultValue={searchParams.status ?? "all"} className="input w-36" aria-label="Status">
          <option value="all">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-outline px-4 py-2 text-xs">Filter</button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="No products match" message="Create your first product or clear filters." action={<Link href="/admin/products/new" className="btn-gold">New product</Link>} />
      ) : (
        <form>
          <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                  <th className="p-3"><span className="sr-only">Select</span></th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Kind</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Featured</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-[#F5EFE3] last:border-0 hover:bg-champagne/40">
                    <td className="p-3"><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="accent-burgundy" /></td>
                    <td className="p-3">
                      <Link href={`/admin/products/${p.id}`} className="font-medium text-charcoal hover:text-burgundy">{p.name}</Link>
                      <p className="text-xs text-charcoal-muted">/{p.slug} {p.is_demo ? "· demo" : ""}</p>
                    </td>
                    <td className="p-3">{KIND_LABEL[p.kind] ?? p.kind}</td>
                    <td className="p-3">
                      {formatINR(p.price_sale ?? p.price_selling)}
                      {p.price_sale ? <span className="ml-1 text-xs text-charcoal-muted line-through">{formatINR(p.price_selling)}</span> : null}
                    </td>
                    <td className="p-3"><Badge tone={STATUS_TONE[p.status] ?? "gray"}>{p.status}</Badge></td>
                    <td className="p-3">{p.is_featured ? "★" : "—"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${p.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</Link>
                        <button formAction={duplicateProductAction} name="id" value={p.id} className="btn-ghost px-2 py-1 text-xs">Duplicate</button>
                        <ConfirmSubmitButton
                          label="Delete"
                          confirmText={`Delete "${p.name}" permanently?`}
                          className="btn-ghost px-2 py-1 text-xs text-burgundy"
                          name="id"
                          value={p.id}
                          formAction={deleteProductAction}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-charcoal-muted">With selected:</span>
            <select name="bulk" className="input w-36 text-xs" aria-label="Bulk action">
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="feature">Feature</option>
              <option value="unfeature">Unfeature</option>
            </select>
            <button formAction={bulkProductAction} className="btn-outline px-4 py-2 text-xs">Apply</button>
          </div>
        </form>
      )}
      <Pagination
        page={page}
        total={result.total}
        pageSize={15}
        makeHref={(p) => {
          const params = new URLSearchParams();
          if (searchParams.q) params.set("q", searchParams.q);
          if (searchParams.kind) params.set("kind", searchParams.kind);
          if (searchParams.status) params.set("status", searchParams.status);
          params.set("page", String(p));
          return `/admin/products?${params}`;
        }}
      />
    </div>
  );
}
