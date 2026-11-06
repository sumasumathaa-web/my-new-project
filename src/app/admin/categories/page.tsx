import { listCategories } from "@/lib/db/catalog";
import { deleteCategoryAction, reorderCategoryAction, upsertCategoryAction } from "../actions-catalog";
import { Badge, ConfirmSubmitButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: { saved?: string; deleted?: string; error?: string; edit?: string };
}) {
  const categories = await listCategories({ all: true });
  const editing = categories.find((c) => c.id === searchParams.edit) ?? null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Categories</h2>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : searchParams.deleted ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Deleted.</p>
      ) : null}

      <form action={upsertCategoryAction} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div>
          <label className="label" htmlFor="cat-name">Name *</label>
          <input id="cat-name" name="name" required maxLength={120} defaultValue={editing?.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cat-slug">Slug</label>
          <input id="cat-slug" name="slug" maxLength={120} defaultValue={editing?.slug ?? ""} placeholder="auto" className="input font-mono text-xs" />
        </div>
        <div>
          <label className="label" htmlFor="cat-kind">Kind *</label>
          <select id="cat-kind" name="kind" defaultValue={editing?.kind ?? "video"} className="input">
            {["video", "website", "card", "quote", "service", "other"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cat-parent">Parent category</label>
          <select id="cat-parent" name="parent_id" defaultValue={editing?.parent_id ?? ""} className="input">
            <option value="">— top level —</option>
            {categories.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cat-sort">Sort order</label>
          <input id="cat-sort" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className="input" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={editing?.is_published ?? true} className="accent-burgundy" />
            Published
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="label" htmlFor="cat-desc">Description</label>
          <input id="cat-desc" name="description" maxLength={500} defaultValue={editing?.description ?? ""} className="input" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
          <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editing ? "Save category" : "Add category"}</button>
          {editing ? (
            <a href="/admin/categories" className="btn-ghost px-3 py-2 text-sm">Cancel edit</a>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
              <th className="p-3">Name</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Sort</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-[#F5EFE3] last:border-0">
                <td className="p-3 font-medium">{c.name}<p className="text-xs font-normal text-charcoal-muted">/{c.slug}</p></td>
                <td className="p-3">{c.kind}</td>
                <td className="p-3">{c.sort_order}</td>
                <td className="p-3"><Badge tone={c.is_published ? "green" : "gray"}>{c.is_published ? "published" : "hidden"}</Badge></td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <a href={`/admin/categories?edit=${c.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                    <form className="inline">
                      <button formAction={reorderCategoryAction} name="dir" value="up" className="btn-ghost px-2 py-1 text-xs" aria-label="Move up">↑</button>
                      <input type="hidden" name="id" value={c.id} />
                      <button formAction={reorderCategoryAction} name="dir" value="down" className="btn-ghost px-2 py-1 text-xs" aria-label="Move down">↓</button>
                    </form>
                    <form className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmitButton
                        label="Delete"
                        confirmText={`Delete category "${c.name}"? Fails if products are attached.`}
                        className="btn-ghost px-2 py-1 text-xs text-burgundy"
                        formAction={deleteCategoryAction}
                      />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
