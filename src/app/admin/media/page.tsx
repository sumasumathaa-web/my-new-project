import { listObjects } from "@/lib/db/storage";
import { deleteMediaAction } from "../actions-site";
import { Badge, ConfirmSubmitButton, EmptyState } from "@/components/ui";
import { MediaUploader } from "@/components/admin/media-uploader";
import { CopyUrlButton } from "@/components/admin/copy-url-button";
export const dynamic = "force-dynamic";
export const metadata = { title: "Media library" };

const PUBLIC_BUCKET = "public-media";

function publicUrl(path: string): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/${PUBLIC_BUCKET}/${path}`;
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: { prefix?: string; saved?: string; deleted?: string; error?: string };
}) {
  const prefix = searchParams.prefix ?? "products";
  const { items, folders } = await listObjects(PUBLIC_BUCKET, prefix, 200);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Media library</h2>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.deleted ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Deleted.</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : null}

      <div className="card p-5">
        <h3 className="font-serif text-lg text-charcoal">Upload (public-media bucket)</h3>
        <p className="text-xs text-charcoal-muted">Images ≤ 5 MB, videos ≤ 60 MB. Saved under <code className="font-mono">{prefix}/</code>.</p>
        <MediaUploader prefix={prefix} />
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Folder">
        {["products", "themes", "hero", "invites"].map((p) => (
          <a key={p} href={`/admin/media?prefix=${p}`} className={`rounded-full px-4 py-1.5 text-sm ${prefix === p ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}>{p}/</a>
        ))}
      </nav>
      {folders.length > 0 ? (
        <p className="text-xs text-charcoal-muted">Subfolders: {folders.join(", ")}</p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No files here yet" message={`Upload an image or video into ${prefix}/ above.`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => {
            const path = `${prefix}/${f.name}`;
            const url = publicUrl(path);
            return (
              <li key={f.name} className="card overflow-hidden">
                {url && /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f.name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={f.name} className="h-36 w-full object-cover" />
                ) : /\.(mp4|webm|mov)$/i.test(f.name) && url ? (
                  <video src={url} controls className="h-36 w-full object-cover" preload="metadata" />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-champagne text-sm text-charcoal-muted">file</div>
                )}
                <div className="space-y-2 p-3">
                  <p className="truncate font-mono text-xs" title={f.name}>{f.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone="gray">{(Number(f.size) / 1024).toFixed(0)} KB</Badge>
                    {url ? <CopyUrlButton url={url} /> : null}
                    <form className="ml-auto">
                      <input type="hidden" name="bucket" value={PUBLIC_BUCKET} />
                      <input type="hidden" name="path" value={path} />
                      <ConfirmSubmitButton label="Delete" confirmText={`Delete ${f.name} permanently?`} className="btn-ghost px-2 py-1 text-xs text-burgundy" formAction={deleteMediaAction} />
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
