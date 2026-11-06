import { safeServiceSupabase } from "@/lib/supabase/admin";
import { listCategories } from "@/lib/db/catalog";
import { deleteThemeAction, upsertThemeAction } from "../actions-catalog";
import { Badge, ConfirmSubmitButton } from "@/components/ui";
import { formatINR } from "@/lib/money";
import type { Theme } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage({
  searchParams,
}: {
  searchParams: { saved?: string; deleted?: string; error?: string; edit?: string };
}) {
  const sb = safeServiceSupabase();
  const { data } = sb ? await sb.from("themes").select("*").order("sort_order") : { data: [] };
  const themes = (data ?? []) as Theme[];
  const categories = await listCategories({ all: true });
  const editing = themes.find((t) => t.id === searchParams.edit) ?? null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Themes</h2>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : searchParams.deleted ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Deleted.</p>
      ) : null}

      <form action={upsertThemeAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div>
          <label className="label" htmlFor="t-name">Name *</label>
          <input id="t-name" name="name" required maxLength={120} defaultValue={editing?.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="t-slug">Slug</label>
          <input id="t-slug" name="slug" maxLength={120} defaultValue={editing?.slug ?? ""} placeholder="auto" className="input font-mono text-xs" />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Description</label>
          <input id="t-desc" name="description" maxLength={500} defaultValue={editing?.description ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="t-cat">Category</label>
          <select id="t-cat" name="category_id" defaultValue={editing?.category_id ?? ""} className="input">
            <option value="">— none —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-price">Price (₹, blank = included)</label>
          <input id="t-price" name="price" type="number" step="0.01" min="0" defaultValue={editing?.price ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="t-tags">Tags (comma separated)</label>
          <input id="t-tags" name="tags" defaultValue={(editing?.tags ?? []).join(", ")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="t-preview">Preview image path</label>
          <input id="t-preview" name="preview_image_path" maxLength={400} defaultValue={editing?.preview_image_path ?? ""} className="input font-mono text-xs" />
        </div>
        <div>
          <label className="label" htmlFor="t-demo">Demo URL</label>
          <input id="t-demo" name="demo_url" type="url" maxLength={400} defaultValue={editing?.demo_url ?? ""} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="t-config">Config (JSON: bg, accent, font)</label>
          <textarea id="t-config" name="config" rows={2} className="input font-mono text-xs" defaultValue={JSON.stringify(editing?.config ?? { bg: "#FAF7F1", accent: "#B08D57", font: "serif" })} />
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={editing?.is_published ?? true} className="accent-burgundy" /> Published</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured ?? false} className="accent-burgundy" /> Featured</label>
          <label className="flex items-center gap-2">Sort <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className="input w-20" /></label>
        </div>
        <div className="col-span-full flex gap-3">
          <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editing ? "Save theme" : "Add theme"}</button>
          {editing ? <a href="/admin/themes" className="btn-ghost px-3 py-2 text-sm">Cancel edit</a> : null}
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {themes.map((t) => {
          const cfg = (t.config ?? {}) as { bg?: string; accent?: string };
          return (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-charcoal-muted">/{t.slug} {t.price ? `· ${formatINR(t.price)}` : ""} {t.is_demo ? "· demo" : ""}</p>
                </div>
                <span className="h-8 w-8 rounded-full border" style={{ background: cfg.bg ?? "#F3EAD9", borderColor: cfg.accent ?? "#B08D57" }} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={t.is_published ? "green" : "gray"}>{t.is_published ? "published" : "hidden"}</Badge>
                {t.is_featured ? <Badge tone="gold">featured</Badge> : null}
                <span className="ml-auto flex gap-2">
                  <a href={`/admin/themes?edit=${t.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                  <form className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmSubmitButton label="Delete" confirmText={`Delete theme "${t.name}"?`} className="btn-ghost px-2 py-1 text-xs text-burgundy" formAction={deleteThemeAction} />
                  </form>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
