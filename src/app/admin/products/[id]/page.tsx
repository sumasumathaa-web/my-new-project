import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, listCategories } from "@/lib/db/catalog";
import { upsertProductAction, addProductMediaAction, deleteProductMediaAction } from "../../actions-catalog";
import { ConfirmSubmitButton } from "@/components/ui";
import { mediaUrl } from "@/lib/db/storage";

export const dynamic = "force-dynamic";

const SCHEMA_TEMPLATE = `[
  {"key":"bride_name","label":"Partner A name","type":"text","required":true,"maxLength":60},
  {"key":"groom_name","label":"Partner B name","type":"text","required":true,"maxLength":60},
  {"key":"wedding_date","label":"Wedding date","type":"date","required":true},
  {"key":"venue_name","label":"Venue name","type":"text","required":true,"maxLength":120},
  {"key":"bg_color","label":"Background colour","type":"color"},
  {"key":"accent_color","label":"Accent colour","type":"color"}
]`;

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const isNew = params.id === "new";
  const [product, categories] = await Promise.all([
    isNew ? Promise.resolve(null) : getProductById(params.id, true),
    listCategories({ all: true }),
  ]);
  if (!isNew && !product) notFound();

  const flash = searchParams.error ? (
    <p className="mb-4 rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
  ) : searchParams.saved ? (
    <p className="mb-4 rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved. Storefront updated.</p>
  ) : null;

  const p = product;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="btn-ghost px-2 py-1 text-sm">← Products</Link>
        <h2 className="font-serif text-2xl text-charcoal">{isNew ? "New product" : `Edit: ${p!.name}`}</h2>
        {!isNew && p!.is_demo ? <span className="badge-amber">demo data</span> : null}
      </div>
      {flash}

      <form action={upsertProductAction} className="card grid gap-5 p-6">
        {!isNew ? <input type="hidden" name="id" value={p!.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name *</label>
            <input id="name" name="name" required maxLength={160} defaultValue={p?.name ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="slug">Slug (URL)</label>
            <input id="slug" name="slug" maxLength={120} defaultValue={p?.slug ?? ""} placeholder="auto from name" className="input font-mono text-xs" />
          </div>
          <div>
            <label className="label" htmlFor="kind">Kind *</label>
            <select id="kind" name="kind" defaultValue={p?.kind ?? "video"} className="input">
              {["video", "website", "card", "quote", "service", "other"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="category_id">Category</label>
            <select id="category_id" name="category_id" defaultValue={p?.category_id ?? ""} className="input">
              <option value="">— uncategorised —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.kind} · {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={p?.status ?? "draft"} className="input">
              {["draft", "published", "archived", "unavailable"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tags">Tags (comma separated)</label>
            <input id="tags" name="tags" defaultValue={(p?.tags ?? []).join(", ")} className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price_original">Original price (₹)</label>
            <input id="price_original" name="price_original" type="number" step="0.01" min="0" defaultValue={p?.price_original ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="price_selling">Selling price (₹) *</label>
            <input id="price_selling" name="price_selling" type="number" step="0.01" min="0.01" required defaultValue={p?.price_selling ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="price_sale">Sale price (₹, optional)</label>
            <input id="price_sale" name="price_sale" type="number" step="0.01" min="0" defaultValue={p?.price_sale ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="customization_fee">Customization fee (₹)</label>
            <input id="customization_fee" name="customization_fee" type="number" step="0.01" min="0" defaultValue={p?.customization_fee ?? 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="extra_revision_fee">Extra revision fee (₹)</label>
            <input id="extra_revision_fee" name="extra_revision_fee" type="number" step="0.01" min="0" defaultValue={p?.extra_revision_fee ?? 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="tax_rate">Tax override (% — blank uses global)</label>
            <input id="tax_rate" name="tax_rate" type="number" step="0.01" min="0" max="100" defaultValue={p?.tax_rate ?? ""} className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="description">Short description</label>
            <textarea id="description" name="description" rows={2} maxLength={500} defaultValue={p?.description ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="long_description">Long description</label>
            <textarea id="long_description" name="long_description" rows={2} maxLength={8000} defaultValue={p?.long_description ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="thumbnail_path">Thumbnail path (from Media Library)</label>
            <input id="thumbnail_path" name="thumbnail_path" maxLength={400} defaultValue={p?.thumbnail_path ?? ""} className="input font-mono text-xs" placeholder="products/royal.jpg" />
            {p?.thumbnail_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(p.thumbnail_path)!} alt="thumbnail" className="mt-2 h-16 rounded-lg border border-[#E8DFCE] object-cover" />
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="preview_video_path">Preview video path</label>
            <input id="preview_video_path" name="preview_video_path" maxLength={400} defaultValue={p?.preview_video_path ?? ""} className="input font-mono text-xs" />
          </div>
          <div>
            <label className="label" htmlFor="demo_url">Live demo URL</label>
            <input id="demo_url" name="demo_url" type="url" maxLength={400} defaultValue={p?.demo_url ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="delivery_estimate">Delivery estimate</label>
            <input id="delivery_estimate" name="delivery_estimate" maxLength={120} defaultValue={p?.delivery_estimate ?? ""} className="input" placeholder="3–5 working days" />
          </div>
          <div>
            <label className="label" htmlFor="revision_policy">Revision policy</label>
            <input id="revision_policy" name="revision_policy" maxLength={300} defaultValue={p?.revision_policy ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="license_terms">License terms</label>
            <input id="license_terms" name="license_terms" maxLength={300} defaultValue={p?.license_terms ?? ""} className="input" />
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="label" htmlFor="service_addons">Service add-ons (JSON array)</label>
            <textarea
              id="service_addons"
              name="service_addons"
              rows={2}
              className="input font-mono text-xs"
              defaultValue={JSON.stringify(p?.service_addons ?? [], null, 0)}
              placeholder='[{"name":"Priority delivery","price":299}]'
            />
          </div>
          <div>
            <label className="label flex items-center gap-2" htmlFor="customization_enabled">
              <input type="checkbox" id="customization_enabled" name="customization_enabled" defaultChecked={p?.customization_enabled ?? false} className="accent-burgundy" />
              Customer can personalise this product
            </label>
            <label className="label mt-2" htmlFor="customization_schema">Customization fields (JSON array)</label>
            <textarea
              id="customization_schema"
              name="customization_schema"
              rows={6}
              className="input font-mono text-xs"
              defaultValue={p ? JSON.stringify(p.customization_schema ?? [], null, 2) : SCHEMA_TEMPLATE}
            />
            <p className="mt-1 text-xs text-charcoal-muted">
              Field types: text, textarea, date, time, color, select (with options), url, image, checkbox. The customer editor renders exactly these fields.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_featured" defaultChecked={p?.is_featured ?? false} className="accent-burgundy" /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            Sort order <input name="sort_order" type="number" className="input w-24" defaultValue={p?.sort_order ?? 0} />
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-burgundy">{isNew ? "Create product" : "Save changes"}</button>
          <Link href="/admin/products" className="btn-ghost">Cancel</Link>
        </div>
      </form>

      {!isNew ? (
        <div className="card p-6">
          <h3 className="font-serif text-xl text-charcoal">Gallery media</h3>
          <ul className="mt-3 space-y-2">
            {(p!.media ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="badge-gray">{m.kind}</span>
                  <code className="font-mono text-xs">{m.path}</code>
                  <form className="ml-auto">
                    <input type="hidden" name="product_id" value={p!.id} />
                    <ConfirmSubmitButton
                      label="Remove"
                      confirmText="Remove this media entry?"
                      className="text-xs text-burgundy underline"
                      name="media_id"
                      value={m.id}
                      formAction={deleteProductMediaAction}
                    />
                  </form>
                </li>
              ))}
            {(p!.media ?? []).length === 0 ? <p className="text-sm text-charcoal-muted">No extra media yet.</p> : null}
          </ul>
          <form action={addProductMediaAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto]">
            <input type="hidden" name="product_id" value={p!.id} />
            <input name="path" required placeholder="storage path (from Media Library)" className="input font-mono text-xs" aria-label="Media path" />
            <select name="kind" className="input" aria-label="Kind"><option value="image">image</option><option value="video">video</option></select>
            <input name="alt" placeholder="alt text" className="input text-xs" aria-label="Alt text" />
            <button className="btn-outline px-4 py-2 text-xs">Add</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
