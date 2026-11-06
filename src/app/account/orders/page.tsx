import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUserOrders } from "@/lib/db/orders";
import { formatINR } from "@/lib/money";
import { EmptyState, OrderStatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await listUserOrders(user.id);
  return (
    <div>
      <h1 className="font-serif text-3xl text-charcoal">My orders</h1>
      {orders.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No orders yet"
            message="Your invitation purchases will appear here."
            action={<Link href="/invitation-videos" className="btn-gold">Browse invitations</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="card flex flex-wrap items-center gap-4 p-5 transition hover:shadow-soft"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-charcoal">{o.order_number}</p>
                <p className="text-xs text-charcoal-muted">
                  {new Date(o.placed_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
              </div>
              <p className="text-sm text-charcoal-soft">
                {(o.items ?? []).map((i) => i.product_name).slice(0, 2).join(", ")}
                {(o.items ?? []).length > 2 ? ` +${o.items!.length - 2} more` : ""}
              </p>
              <div className="ml-auto flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="font-serif text-lg text-burgundy">{formatINR(Number(o.grand_total))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
