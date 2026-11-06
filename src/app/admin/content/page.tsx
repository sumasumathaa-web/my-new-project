import { safeServiceSupabase } from "@/lib/supabase/admin";
import {
  deleteFaqAction,
  deleteQuoteAction,
  upsertFaqAction,
  upsertPageAction,
  upsertQuoteAction,
} from "../actions-catalog";
import { Badge, ConfirmSubmitButton } from "@/components/ui";
import type { ContentPage, Faq, Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "quotes", label: "Quotes & Wording" },
  { id: "faqs", label: "FAQs" },
  { id: "pages", label: "Policy Pages" },
];

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: { tab?: string; saved?: string; deleted?: string; error?: string; edit?: string };
}) {
  const tab = TABS.find((t) => t.id === searchParams.tab)?.id ?? "quotes";
  const sb = safeServiceSupabase();

  const [quotesRes, faqsRes, pagesRes] = sb
    ? await Promise.all([
        tab === "quotes" ? sb.from("quotes").select("*").order("sort_order") : Promise.resolve({ data: [] }),
        tab === "faqs" ? sb.from("faqs").select("*").order("sort_order") : Promise.resolve({ data: [] }),
        tab === "pages" ? sb.from("content_pages").select("*").order("slug") : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const quotes = (quotesRes.data ?? []) as Quote[];
  const faqs = (faqsRes.data ?? []) as Faq[];
  const pages = (pagesRes.data ?? []) as ContentPage[];
  const editQuote = quotes.find((q) => q.id === searchParams.edit) ?? null;
  const editFaq = faqs.find((f) => f.id === searchParams.edit) ?? null;
  const editPage = pages.find((p) => p.id === searchParams.edit) ?? null;

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Quotes & content</h2>
      <nav className="flex gap-2" aria-label="Content tabs">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/admin/content?tab=${t.id}`}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : null}

      {tab === "quotes" ? (
        <>
          <form action={upsertQuoteAction} className="card grid gap-4 p-5">
            {editQuote ? <input type="hidden" name="id" value={editQuote.id} /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="q-text">Quote (English) *</label>
                <textarea id="q-text" name="text" required rows={2} maxLength={800} defaultValue={editQuote?.text ?? ""} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="q-ta">Tamil text (optional)</label>
                <textarea id="q-ta" name="text_ta" rows={2} maxLength={800} defaultValue={editQuote?.text_ta ?? ""} className="input" lang="ta" />
              </div>
              <div>
                <label className="label" htmlFor="q-author">Author / source</label>
                <input id="q-author" name="author" maxLength={120} defaultValue={editQuote?.author ?? ""} className="input" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label" htmlFor="q-cat">Category</label>
                  <select id="q-cat" name="category" defaultValue={editQuote?.category ?? "wedding"} className="input">
                    {["wedding", "love", "tamil", "english", "wording", "family", "event"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="q-sort">Sort</label>
                  <input id="q-sort" name="sort_order" type="number" defaultValue={editQuote?.sort_order ?? 0} className="input" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={editQuote?.is_published ?? true} className="accent-burgundy" /> Published</label>
                </div>
              </div>
            </div>
            <div>
              <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editQuote ? "Save quote" : "Add quote"}</button>
              {editQuote ? <a href="/admin/content?tab=quotes" className="btn-ghost ml-2 px-3 py-2 text-sm">Cancel</a> : null}
            </div>
          </form>
          <ul className="space-y-3">
            {quotes.map((q) => (
              <li key={q.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif">{q.text}</p>
                  <p className="text-xs text-charcoal-muted">{q.category} · {q.author ?? "—"}</p>
                </div>
                <Badge tone={q.is_published ? "green" : "gray"}>{q.is_published ? "live" : "hidden"}</Badge>
                <a href={`/admin/content?tab=quotes&edit=${q.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                <form>
                  <ConfirmSubmitButton label="Delete" confirmText="Delete this quote?" className="btn-ghost px-2 py-1 text-xs text-burgundy" name="id" value={q.id} formAction={deleteQuoteAction} />
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "faqs" ? (
        <>
          <form action={upsertFaqAction} className="card grid gap-4 p-5">
            {editFaq ? <input type="hidden" name="id" value={editFaq.id} /> : null}
            <div>
              <label className="label" htmlFor="f-q">Question *</label>
              <input id="f-q" name="question" required maxLength={300} defaultValue={editFaq?.question ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="f-a">Answer *</label>
              <textarea id="f-a" name="answer" required rows={3} maxLength={3000} defaultValue={editFaq?.answer ?? ""} className="input" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="label" htmlFor="f-cat">Category</label>
                <input id="f-cat" name="category" maxLength={40} defaultValue={editFaq?.category ?? ""} className="input w-44" placeholder="delivery" />
              </div>
              <div>
                <label className="label" htmlFor="f-sort">Sort</label>
                <input id="f-sort" name="sort_order" type="number" defaultValue={editFaq?.sort_order ?? 0} className="input w-24" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={editFaq?.is_published ?? true} className="accent-burgundy" /> Published</label>
            </div>
            <div>
              <button type="submit" className="btn-burgundy px-5 py-2 text-sm">{editFaq ? "Save FAQ" : "Add FAQ"}</button>
              {editFaq ? <a href="/admin/content?tab=faqs" className="btn-ghost ml-2 px-3 py-2 text-sm">Cancel</a> : null}
            </div>
          </form>
          <ul className="space-y-3">
            {faqs.map((f) => (
              <li key={f.id} className="card flex flex-wrap items-center gap-3 p-4">
                <p className="min-w-0 flex-1 font-medium">{f.question}</p>
                <Badge tone="gray">{f.category ?? "general"}</Badge>
                <Badge tone={f.is_published ? "green" : "gray"}>{f.is_published ? "live" : "hidden"}</Badge>
                <a href={`/admin/content?tab=faqs&edit=${f.id}`} className="btn-ghost px-2 py-1 text-xs">Edit</a>
                <form>
                  <ConfirmSubmitButton label="Delete" confirmText="Delete this FAQ?" className="btn-ghost px-2 py-1 text-xs text-burgundy" name="id" value={f.id} formAction={deleteFaqAction} />
                </form>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "pages" ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pages.map((p) => (
              <li key={p.id} className="card p-4">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-charcoal-muted">/{p.slug} · updated {new Date(p.updated_at).toLocaleDateString("en-IN")}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={p.is_published ? "green" : "gray"}>{p.is_published ? "live" : "hidden"}</Badge>
                  <a href={`/admin/content?tab=pages&edit=${p.id}`} className="btn-ghost ml-auto px-2 py-1 text-xs">Edit content</a>
                  <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">View ↗</a>
                </div>
              </li>
            ))}
          </ul>
          {editPage ? (
            <form action={upsertPageAction} className="card grid gap-4 p-5">
              <input type="hidden" name="id" value={editPage.id} />
              <h3 className="font-serif text-xl">Editing: {editPage.title}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="p-slug">Slug</label>
                  <input id="p-slug" name="slug" required maxLength={120} defaultValue={editPage.slug} className="input font-mono text-xs" />
                </div>
                <div>
                  <label className="label" htmlFor="p-title">Title</label>
                  <input id="p-title" name="title" required maxLength={200} defaultValue={editPage.title} className="input" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={editPage.is_published} className="accent-burgundy" /> Published</label>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="p-body">Body (markdown-lite: #, ##, ###, **bold**, *italic*, - lists, [links](url))</label>
                <textarea id="p-body" name="body_md" rows={14} required defaultValue={editPage.body_md} className="input font-mono text-sm" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-burgundy px-5 py-2 text-sm">Save page</button>
                <a href="/admin/content?tab=pages" className="btn-ghost px-3 py-2 text-sm">Cancel</a>
              </div>
            </form>
          ) : (
            <p className="text-sm text-charcoal-muted">Select a page above to edit its content. (Policies are templates — review against your actual operations and laws.)</p>
          )}
        </>
      ) : null}
    </div>
  );
}
