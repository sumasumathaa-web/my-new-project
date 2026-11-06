import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerAdmin } from "@/lib/db/customers";
import { listUserOrders, PAID_STATUSES } from "@/lib/db/orders";
import { listTickets } from "@/lib/db/customers";
import { Badge, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await getCustomerAdmin(params.id);
  if (!customer) notFound();
  const [orders, ticketsRes] = await Promise.all([
    listUserOrders(customer.id),
    listTickets({ userId: customer.id }),
  ]);
  const tickets = ticketsRes.items;
  const stats = {
    total: orders.length,
    paid: orders.filter((o) => PAID_STATUSES.includes(o.status)).length,
    spend: orders.filter((o) => PAID_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.grand_total), 0),
    openTickets: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/customers" className="btn-ghost px-2 py-1 text-sm">← Customers</Link>
        <h2 className="font-serif text-2xl text-charcoal">{customer.full_name || customer.email}</h2>
        {customer.roles.map((r) => <Badge key={r} tone={r === "admin" ? "gold" : "gray"}>{r}</Badge>)}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Orders", stats.total],
          ["Paid orders", stats.paid],
          ["Lifetime spend", formatINR(stats.spend)],
          ["Open tickets", stats.openTickets],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-charcoal-muted">{label}</p>
            <p className="mt-1 font-serif text-xl text-charcoal">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-serif text-lg text-charcoal">Profile</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-charcoal-muted">Email</dt><dd>{customer.email}</dd></div>
          <div><dt className="text-xs text-charcoal-muted">Phone</dt><dd>{customer.phone ?? "—"}</dd></div>
          <div><dt className="text-xs text-charcoal-muted">Marketing opt-in</dt><dd>{customer.marketing_opt_in ? "Yes" : "No"}</dd></div>
          <div><dt className="text-xs text-charcoal-muted">Joined</dt><dd>{new Date(customer.created_at).toLocaleDateString("en-IN")}</dd></div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-serif text-lg text-charcoal">Order history</h3>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" message="This customer hasn't purchased anything." />
          ) : (
            <ul className="mt-3 divide-y divide-[#F5EFE3]">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-burgundy underline-offset-2 hover:underline">{o.order_number}</Link>
                  <Badge tone={PAID_STATUSES.includes(o.status) ? "green" : "gray"}>{o.status.replace(/_/g, " ")}</Badge>
                  <span className="ml-auto font-medium">{formatINR(o.grand_total)}</span>
                  <span className="w-20 text-right text-xs text-charcoal-muted">{new Date(o.placed_at).toLocaleDateString("en-IN")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-serif text-lg text-charcoal">Support tickets</h3>
          {tickets.length === 0 ? (
            <EmptyState title="No tickets" message="No support requests from this customer." />
          ) : (
            <ul className="mt-3 divide-y divide-[#F5EFE3]">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/support/${t.id}`} className="min-w-0 flex-1 truncate font-medium text-burgundy underline-offset-2 hover:underline">{t.subject}</Link>
                  <Badge tone={t.status === "open" ? "amber" : t.status === "closed" ? "gray" : "blue"}>{t.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
