import Link from "next/link";
import { listAllCustomizationsAdmin } from "@/lib/db/customizations";
import { adminSetCustomizationStatusAction } from "../actions-orders";
import { Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer websites" };

export default async function AdminCustomerWebsitesPage({
  searchParams,
}: {
  searchParams: { status?: string; saved?: string; error?: string };
}) {
  const all = await listAllCustomizationsAdmin();
  const status = searchParams.status ?? "all";
  const items = status === "all" ? all : all.filter((c) => c.status === status);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Customer websites</h2>
      <nav className="flex gap-2" aria-label="Status filter">
        {["all", "draft", "published", "archived"].map((s) => (
          <a key={s} href={`/admin/customer-websites?status=${s}`} className={`rounded-full px-4 py-1.5 text-sm ${status === s ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}>{s}</a>
        ))}
      </nav>
      {searchParams.error ? <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p> : null}
      {searchParams.saved ? <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Status updated.</p> : null}

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" message="Customer invitations created from purchased products appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="p-3">Invitation</th>
                <th className="p-3">Based on</th>
                <th className="p-3">Version</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-[#F5EFE3] last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="font-mono text-xs text-charcoal-muted">/w/{c.slug}</p>
                  </td>
                  <td className="p-3 text-xs">{c.product_name ?? "—"}</td>
                  <td className="p-3">v{c.version}</td>
                  <td className="p-3">
                    <Badge tone={c.status === "published" ? "green" : c.status === "archived" ? "gray" : "amber"}>{c.status}</Badge>
                  </td>
                  <td className="p-3 text-xs">{new Date(c.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {c.status === "published" ? (
                        <Link href={`/w/${c.slug}`} target="_blank" className="btn-ghost px-2 py-1 text-xs">View ↗</Link>
                      ) : null}
                      {(["draft", "published", "archived"] as const).filter((s) => s !== c.status).map((s) => (
                        <form key={s} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <button formAction={adminSetCustomizationStatusAction} name="status" value={s} className="btn-ghost px-2 py-1 text-xs capitalize">
                            → {s}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
