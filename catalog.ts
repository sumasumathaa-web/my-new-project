/** Catalog reads (categories, products, themes, quotes) via service role. */
import { safeServiceSupabase } from "@/lib/supabase/admin";
import type { Category, Product, Quote, Theme, Faq, ContentPage, OfferBanner } from "@/lib/types";

export const PAGE_SIZE = 12;

function ilikeEscape(q: string): string {
  return q.replace(/[%_\\]/g, (m) => `\\${m}`).slice(0, 120);
}

/* ------------------------------- Categories ------------------------------ */
export async function listCategories(opts?: { kind?: string; all?: boolean }): Promise<Category[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  let query = sb.from("categories").select("*").order("sort_order", { ascending: true });
  if (opts?.kind) query = query.eq("kind", opts.kind);
  if (!opts?.all) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Category[];
}

export type ProductSort = "featured" | "new" | "price_asc" | "price_desc";

export interface ProductQuery {
  kind?: string;
  categorySlug?: string;
  q?: string;
  sort?: ProductSort;
  featuredOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listProducts(query: ProductQuery): Promise<ProductListResult> {
  const empty: ProductListResult = { items: [], total: 0, page: 1, pageSize: query.pageSize ?? PAGE_SIZE };
  const sb = safeServiceSupabase();
  if (!sb) return empty;

  let categoryId: string | null = null;
  if (query.categorySlug) {
    const { data: cat } = await sb
      .from("categories")
      .select("id, parent_id")
      .eq("slug", query.categorySlug)
      .maybeSingle();
    if (!cat) return empty;
    categoryId = cat.id;
    // include child categories
    const { data: children } = await sb.from("categories").select("id").eq("parent_id", cat.id);
    const ids = [cat.id, ...(children ?? []).map((c: { id: string }) => c.id)];
    return runProductQuery(sb, query, ids);
  }
  return runProductQuery(sb, query, categoryId ? [categoryId] : null);
}

async function runProductQuery(
  sb: NonNullable<ReturnType<typeof safeServiceSupabase>>,
  query: ProductQuery,
  categoryIds: string[] | null,
): Promise<ProductListResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? PAGE_SIZE;
  let q = sb.from("products").select("*, category:categories(*)", { count: "exact" });
  if (!query.includeUnpublished) q = q.eq("status", "published");
  if (query.kind) q = q.eq("kind", query.kind);
  if (categoryIds) q = q.in("category_id", categoryIds);
  if (query.featuredOnly) q = q.eq("is_featured", true);
  if (typeof query.minPrice === "number") q = q.gte("price_selling", query.minPrice);
  if (typeof query.maxPrice === "number") q = q.lte("price_selling", query.maxPrice);
  if (query.q) {
    const safe = ilikeEscape(query.q);
    q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%,tags.cs.{${query.q.toLowerCase().replace(/[^a-z0-9-]/g, "")}}`);
  }
  switch (query.sort ?? "featured") {
    case "price_asc":
      q = q.order("price_selling", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price_selling", { ascending: false });
      break;
    case "new":
      q = q.order("created_at", { ascending: false });
      break;
    default:
      q = q.order("is_featured", { ascending: false }).order("sort_order", { ascending: true });
  }
  const from = (page - 1) * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) return { items: [], total: 0, page, pageSize };
  return { items: (data ?? []) as Product[], total: count ?? 0, page, pageSize };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("products")
    .select("*, category:categories(*), media:product_media(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as Product | null) ?? null;
}

export async function getProductById(id: string, includeUnpublished = false): Promise<Product | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  let q = sb.from("products").select("*, category:categories(*)").eq("id", id);
  if (!includeUnpublished) q = q.eq("status", "published");
  const { data } = await q.maybeSingle();
  return (data as Product | null) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  if (ids.length === 0) return map;
  const sb = safeServiceSupabase();
  if (!sb) return map;
  const { data } = await sb.from("products").select("*").in("id", ids.slice(0, 50));
  for (const row of data ?? []) map.set(row.id, row as Product);
  return map;
}

export async function getFeaturedProducts(kind?: string, limit = 6): Promise<Product[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  let q = sb
    .from("products")
    .select("*, category:categories(*)")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []) as Product[];
}

export async function getNewArrivals(limit = 6): Promise<Product[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("products")
    .select("*, category:categories(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Product[];
}

/** Best sellers computed from actual paid/delivered order data. */
export async function getBestSellers(limit = 6): Promise<{ product: Product; units: number }[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("order_items")
    .select("product_id, quantity, orders!inner(status)")
    .in("orders.status", ["paid", "in_progress", "awaiting_info", "ready_for_review", "delivered"])
    .limit(1000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + Number(row.quantity ?? 1));
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (top.length === 0) return [];
  const products = await getProductsByIds(top.map(([id]) => id));
  return top
    .map(([id, units]) => ({ product: products.get(id), units }))
    .filter((x): x is { product: Product; units: number } => Boolean(x.product) && x.product!.status === "published");
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const curated = Array.isArray(product.related_ids) ? product.related_ids.filter(Boolean) : [];
  const out: Product[] = [];
  if (curated.length > 0) {
    const { data } = await sb
      .from("products")
      .select("*, category:categories(*)")
      .in("id", curated.slice(0, limit))
      .eq("status", "published");
    out.push(...((data ?? []) as Product[]));
  }
  if (out.length < limit && product.category_id) {
    const { data } = await sb
      .from("products")
      .select("*, category:categories(*)")
      .eq("category_id", product.category_id)
      .eq("status", "published")
      .neq("id", product.id)
      .limit(limit - out.length);
    for (const p of (data ?? []) as Product[]) if (!out.find((o) => o.id === p.id)) out.push(p);
  }
  return out.slice(0, limit);
}

/* -------------------------------- Themes --------------------------------- */
export async function listThemes(opts?: { featuredOnly?: boolean }): Promise<Theme[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  let q = sb.from("themes").select("*").eq("is_published", true).order("sort_order", { ascending: true });
  if (opts?.featuredOnly) q = q.eq("is_featured", true);
  const { data } = await q;
  return (data ?? []) as Theme[];
}

/* -------------------------------- Content -------------------------------- */
export async function listQuotes(category?: string): Promise<Quote[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  let q = sb.from("quotes").select("*").eq("is_published", true).order("sort_order", { ascending: true });
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return (data ?? []) as Quote[];
}

export async function listFaqs(): Promise<Faq[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb.from("faqs").select("*").eq("is_published", true).order("sort_order", { ascending: true });
  return (data ?? []) as Faq[];
}

export async function getContentPage(slug: string): Promise<ContentPage | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("content_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return (data as ContentPage | null) ?? null;
}

export async function listActiveBanners(placement?: string): Promise<OfferBanner[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const now = new Date().toISOString();
  let q = sb.from("offer_banners").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  if (placement) q = q.eq("placement", placement);
  const { data } = await q;
  return ((data ?? []) as OfferBanner[]).filter((b) => {
    if (b.starts_at && b.starts_at > now) return false;
    if (b.expires_at && b.expires_at < now) return false;
    return true;
  });
}
