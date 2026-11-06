import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { listOrdersAdmin } from "@/lib/db/orders";
import { Badge, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/money";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_progress",
  "awaiting_info",
  "ready_for_review",
  "delivered",
  "cancelled",
  "refunded",
];

const TONE: Record<OrderStatus, "gray" | "blue" | "amber" | "green" | "red" | "gold"> = {
  pending_payment: "amber",
  paid: "green",
  in_progress: "blue",
  awaiting_info: "amber",
  ready_for_review: "gold",
  delivered: "green",
  cancelled: "gray",
  refunded: "red",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string; saved?: string; error?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const status = searchParams.status && STATUSES.includes(searchParams.status as OrderStatus) ? searchParams.status : "all";
  const { items, total } = await listOrdersAdmin({ status, q: searchParams.q ?? "", page, pageSize: 20 });

  const base = `/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(searchParams.q ?? "")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-charcoal">Orders</h2>
        <a href={`/admin/orders/export?status=${encodeURIComponent(status)}&q=${encodeURIComponent(searchParams.q ?? "")}`} className="btn-outline px-4 py-2 text-sm">
          Export CSV
        </a>
      </div>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : null}

      <form action="/admin/orders" className="card flex flex-wrap items-end gap-3 p-4" role="search">
        <div>
          <label className="label" htmlFor="oq">Search (order # / email)</label>
          <input id="oq" name="q" defaultValue={searchParams.q ?? ""} className="input w-64" />
        </div>
        <div>
          <label className="label" htmlFor="ostatus">Status</label>
          <select id="ostatus" name="status" defaultValue={status} className="input">
            <option value="all">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <button className="btn-burgundy px-4 py-2 text-sm">Filter</button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="No orders match" message="Try a different filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Placed</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-[#F5EFE3] last:border-0 hover:bg-[#FBF7EE]">
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-burgundy underline-offset-2 hover:underline">
                      {o.order_number}
                    </Link>
                    <p className="text-xs text-charcoal-muted">{(o.items ?? []).length} item(s)</p>
                  </td>
                  <td className="p-3">
                    <p className="max-w-[200px] truncate">{o.email}</p>
                    <p className="text-xs text-charcoal-muted">{o.phone ?? "—"}</p>
                  </td>
                  <td className="p-3 text-xs">{new Date(o.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="p-3 font-medium">{formatINR(o.grand_total)}</td>
                  <td className="p-3"><Badge tone={TONE[o.status]}>{o.status.replace(/_/g, " ")}</Badge></td>
                  <td className="p-3"><Badge tone={o.payment_status === "paid" ? "green" : o.payment_status === "failed" ? "red" : "gray"}>{o.payment_status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} makeHref={(p) => `${base}&page=${p}`} />
    </div>
  );
}
