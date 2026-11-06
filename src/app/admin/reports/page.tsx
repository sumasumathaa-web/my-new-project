import Link from "next/link";
import { getOrderStats, listOrdersAdmin } from "@/lib/db/orders";
import { getBestSellers, listProducts } from "@/lib/db/catalog";
import { couponUsageReport } from "@/lib/db/coupons";
import { formatINR, formatPaiseINR } from "@/lib/money";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

function startOfDay(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = searchParams.range === "7" || searchParams.range === "90" ? searchParams.range : "30";
  const since = startOfDay(Number(range));

  const [stats, rangeOrders, best, couponUsage, products] = await Promise.all([
    getOrderStats(),
    listOrdersAdmin({ from: since, pageSize: 500 }),
    getBestSellers(10),
    couponUsageReport(),
    listProducts({ includeUnpublished: true, pageSize: 500 }),
  ]);

  const paidInRange = rangeOrders.items.filter((o) => o.payment_status === "paid");
  const revenueInRange = paidInRange.reduce((s, o) => s + Number(o.grand_total), 0);
  const failedPayments = rangeOrders.items.filter((o) => o.payment_status === "failed").length;
  const draftProducts = products.items.filter((p) => p.status === "draft").length;
  const archivedProducts = products.items.filter((p) => p.status === "archived").length;

  const byStatus = new Map<string, number>();
  for (const o of rangeOrders.items) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-charcoal">Reports</h2>
        <nav className="flex gap-2" aria-label="Range">
          {["7", "30", "90"].map((r) => (
            <a key={r} href={`/admin/reports?range=${r}`} className={`rounded-full px-4 py-1.5 text-sm ${range === r ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}>last {r}d</a>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Verified revenue (all time)", formatPaiseINR(stats.revenuePaise)],
          [`Revenue (last ${range}d)`, formatINR(revenueInRange)],
          [`Paid orders (last ${range}d)`, paidInRange.length],
          [`Failed payments (last ${range}d)`, failedPayments],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-charcoal-muted">{label}</p>
            <p className="mt-1 font-serif text-xl text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal">Orders by status (last {range} days)</h3>
            <Link href="/admin/orders" className="text-xs text-burgundy underline">Orders list</Link>
          </div>
          {byStatus.size === 0 ? (
            <p className="mt-3 text-sm text-charcoal-muted">No orders in this window.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...byStatus.entries()].sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <li key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-36">{status.replace(/_/g, " ")}</span>
                  <span className="h-2 rounded-full bg-burgundy" style={{ width: `${Math.max(6, (count / Math.max(1, rangeOrders.items.length)) * 100)}%` }} aria-hidden />
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-serif text-lg text-charcoal">Best sellers (paid orders, all time)</h3>
          {best.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal-muted">Not enough sales data yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {best.map((b, i) => (
                <li key={b.product.id} className="flex items-baseline gap-3">
                  <span className="w-5 font-mono text-xs text-charcoal-muted">{i + 1}.</span>
                  <Link href={`/admin/products/${b.product.id}`} className="min-w-0 flex-1 truncate font-medium text-charcoal hover:text-burgundy">{b.product.name}</Link>
                  <span className="text-xs text-charcoal-muted">{b.units} sold</span>
                  <span className="font-medium">{formatINR(b.product.price_sale ?? b.product.price_selling)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal">Coupon usage</h3>
            <Link href="/admin/offers?tab=usage" className="text-xs text-burgundy underline">Full usage</Link>
          </div>
          {couponUsage.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal-muted">No coupons created yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-charcoal-muted">
                  <th className="py-1">Code</th><th className="py-1">Uses</th><th className="py-1 text-right">Discount given</th>
                </tr>
              </thead>
              <tbody>
                {couponUsage.slice(0, 8).map((u) => (
                  <tr key={u.id} className="border-t border-[#F5EFE3]">
                    <td className="py-1.5 font-mono">{u.code}</td>
                    <td className="py-1.5">{u.uses}</td>
                    <td className="py-1.5 text-right">{formatINR(u.totalDiscount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal">Catalogue health</h3>
            <Link href="/admin/products" className="text-xs text-burgundy underline">Products</Link>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Total products</dt><dd className="font-medium">{products.total}</dd></div>
            <div className="flex justify-between"><dt>Drafts awaiting publish</dt><dd><Badge tone="amber">{draftProducts}</Badge></dd></div>
            <div className="flex justify-between"><dt>Archived</dt><dd><Badge tone="gray">{archivedProducts}</Badge></dd></div>
            <div className="flex justify-between"><dt>Customers</dt><dd className="font-medium">{stats.totalCustomers}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
