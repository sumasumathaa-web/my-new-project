import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { listCustomersAdmin } from "@/lib/db/customers";
import { Badge, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; saved?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = 20;
  const { items, total } = await listCustomersAdmin({ q, page, pageSize });

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Customers</h2>
      {searchParams.saved ? <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p> : null}

      <form action="/admin/customers" className="card flex flex-wrap items-end gap-3 p-4" role="search">
        <div>
          <label className="label" htmlFor="cq">Search (email / name / phone)</label>
          <input id="cq" name="q" defaultValue={q} className="input w-72" />
        </div>
        <button className="btn-burgundy px-4 py-2 text-sm">Search</button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="No customers found" message="Customers appear after their first order or signup." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="p-3">Customer</th>
                <th className="p-3">Roles</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Lifetime spend (paid)</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c: any) => (
                <tr key={c.id} className="border-b border-[#F5EFE3] last:border-0 hover:bg-[#FBF7EE]">
                  <td className="p-3">
                    <p className="font-medium">{c.full_name ?? "—"}</p>
                    <Link href={`/admin/customers/${c.id}`} className="text-xs text-burgundy underline-offset-2 hover:underline">{c.email}</Link>
                  </td>
                  <td className="p-3">
                    {c.roles.map((r: any) => (
                      <Badge key={r} tone={r === "admin" ? "gold" : "gray"}>{r}</Badge>
                    ))}
                  </td>
                  <td className="p-3 text-xs">{c.phone ?? "—"}</td>
                  <td className="p-3">{c.orderCount}</td>
                  <td className="p-3 font-medium">{formatINR(c.totalSpent)}</td>
                  <td className="p-3 text-xs">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={pageSize} makeHref={(p) => `/admin/customers?q=${encodeURIComponent(q)}&page=${p}`} />
    </div>
  );
}
