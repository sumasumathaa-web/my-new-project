import Link from "next/link";
import { getOrderStats, listOrdersAdmin } from "@/lib/db/orders";
import { getBestSellers } from "@/lib/db/catalog";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { formatPaiseINR, formatINR } from "@/lib/money";
import { EmptyState, OrderStatusBadge } from "@/components/ui";
import type { AuditLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [stats, recent, best] = await Promise.all([
    getOrderStats(),
    listOrdersAdmin({ pageSize: 8 }),
    getBestSellers(5),
  ]);
  const sb = safeServiceSupabase();
  const [{ data: activity }, { count: openTickets }] = sb
    ? await Promise.all([
        sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
        sb.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      ])
    : [{ data: [] }, { count: 0 }];

  const cards = [
    { label: "Verified revenue", value: formatPaiseINR(stats.revenuePaise), accent: true },
    { label: "Total orders", value: String(stats.totalOrders) },
    { label: "Pending payment", value: String(stats.pending) },
    { label: "In progress", value: String(stats.inProgress) },
    { label: "Completed", value: String(stats.completed) },
    { label: "Cancelled", value: String(stats.cancelled) },
    { label: "Customers", value: String(stats.totalCustomers) },
    { label: "Products", value: String(stats.totalProducts) },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-charcoal">Today at a glance</h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            Live figures from the database — nothing here is a placeholder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/new" className="btn-burgundy px-4 py-2 text-xs">+ New product</Link>
          <Link href="/admin/offers" className="btn-outline px-4 py-2 text-xs">Create coupon</Link>
          <Link href="/admin/homepage" className="btn-outline px-4 py-2 text-xs">Edit homepage</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="kpi">
            <p className="text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">{c.label}</p>
            <p className={`mt-1.5 font-serif text-[1.7rem] leading-none ${c.accent ? "text-burgundy" : "text-charcoal"}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-charcoal">Needs attention</h2>
          <Link href="/admin/status" className="text-xs text-burgundy underline">System status</Link>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="card-inset flex items-center justify-between px-4 py-3">
            <span className="text-charcoal-soft">Awaiting payment</span>
            <Link href="/admin/orders?status=pending_payment" className="font-serif text-lg text-burgundy">{stats.pending}</Link>
          </li>
          <li className="card-inset flex items-center justify-between px-4 py-3">
            <span className="text-charcoal-soft">Awaiting customer info</span>
            <Link href="/admin/orders?status=awaiting_customer_information" className="font-serif text-lg text-burgundy">
              {stats.awaitingInfo}
            </Link>
          </li>
          <li className="card-inset flex items-center justify-between px-4 py-3">
            <span className="text-charcoal-soft">Open support tickets</span>
            <Link href="/admin/support" className="font-serif text-lg text-burgundy">{openTickets ?? 0}</Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-charcoal">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs text-burgundy underline">View all</Link>
          </div>
          {recent.items.length === 0 ? (
            <EmptyState title="No orders yet" message="Orders appear here as customers purchase." />
          ) : (
            <ul className="space-y-3 text-sm">
              {recent.items.map((o) => (
                <li key={o.id} className="flex items-center gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold">{o.order_number}</p>
                    <p className="text-xs text-charcoal-muted">{o.email}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-2">
                    <OrderStatusBadge status={o.status} />
                    <span className="font-medium">{formatINR(Number(o.grand_total))}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-serif text-xl text-charcoal">Best-performing products</h2>
          {best.length === 0 ? (
            <EmptyState title="Not enough sales data" message="Rankings compute automatically from paid orders." />
          ) : (
            <ol className="space-y-3 text-sm">
              {best.map((b, i) => (
                <li key={b.product.id} className="flex items-center gap-3">
                  <span className="font-serif text-lg text-gold">{i + 1}</span>
                  <span className="font-medium">{b.product.name}</span>
                  <span className="ml-auto text-charcoal-muted">{b.units} sold</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-charcoal">Recent activity</h2>
          <Link href="/admin/audit-logs" className="text-xs text-burgundy underline">Audit log</Link>
        </div>
        {(activity ?? []).length === 0 ? (
          <p className="text-sm text-charcoal-muted">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(activity as AuditLog[]).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-2">
                <code className="rounded bg-champagne px-2 py-0.5 font-mono text-xs">{a.action}</code>
                <span className="text-charcoal-muted">{a.entity} {a.entity_id?.slice(0, 8)}</span>
                <span className="ml-auto text-xs text-charcoal-muted">
                  {a.actor_email ?? "system"} · {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
