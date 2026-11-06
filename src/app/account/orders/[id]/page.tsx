import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrderOwned, listPaymentsForOrder, listStatusHistory } from "@/lib/db/orders";
import { createSignedUrl } from "@/lib/db/storage";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { Badge, OrderStatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/account/orders/${params.id}`);
  const order = await getOrderOwned(params.id, user.id, false);
  if (!order) notFound();
  const [payments, history] = await Promise.all([listPaymentsForOrder(order.id), listStatusHistory(order.id)]);

  // Time-limited signed download links for purchased deliverables (owner only).
  const deliverables: { name: string; url: string }[] = [];
  if (order.payment_status === "paid") {
    for (const item of order.items ?? []) {
      if (item.deliverable_path) {
        const url = await createSignedUrl(env.bucketDeliverables, item.deliverable_path, 3600);
        if (url) deliverables.push({ name: item.product_name, url });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl text-charcoal sm:text-3xl">Order {order.order_number}</h1>
          <p className="text-xs text-charcoal-muted">
            Placed {new Date(order.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <Badge tone={order.payment_status === "paid" ? "green" : "amber"}>{order.payment_status}</Badge>
        </div>
      </div>

      <div className="card overflow-x-auto p-6">
        <h2 className="mb-4 font-serif text-xl text-charcoal">Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
              <th className="pb-2">Product</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2 text-right">Unit</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((i) => (
              <tr key={i.id} className="border-b border-[#F5EFE3] last:border-0">
                <td className="py-2.5">{i.product_name}</td>
                <td className="py-2.5">{i.quantity}</td>
                <td className="py-2.5 text-right">{formatINR(Number(i.unit_price))}</td>
                <td className="py-2.5 text-right font-medium">{formatINR(Number(i.total))}</td>
              </tr>
            ))}
            {Number(order.discount_total) > 0 ? (
              <tr>
                <td className="py-2.5 text-charcoal-muted" colSpan={3}>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</td>
                <td className="py-2.5 text-right text-[#2F6B38]">−{formatINR(Number(order.discount_total))}</td>
              </tr>
            ) : null}
            {Number(order.tax_total) > 0 ? (
              <tr>
                <td className="py-2.5 text-charcoal-muted" colSpan={3}>Tax</td>
                <td className="py-2.5 text-right">{formatINR(Number(order.tax_total))}</td>
              </tr>
            ) : null}
            <tr>
              <td className="py-3 font-serif text-lg" colSpan={3}>Grand total</td>
              <td className="py-3 text-right font-serif text-lg text-burgundy">{formatINR(Number(order.grand_total))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {deliverables.length ? (
        <div className="card p-6">
          <h2 className="font-serif text-xl text-charcoal">Downloads</h2>
          <p className="mt-1 text-xs text-charcoal-muted">Links are private and expire after 60 minutes.</p>
          <ul className="mt-4 space-y-2">
            {deliverables.map((d) => (
              <li key={d.url}>
                <a href={d.url} className="btn-outline inline-flex text-sm" download>
                  ⬇ {d.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {order.notes_customer ? (
        <div className="card border-l-4 border-l-[#B08D57] p-6">
          <h2 className="font-serif text-lg text-charcoal">Message from the team</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-charcoal-soft">{order.notes_customer}</p>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-lg text-charcoal">Payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-charcoal-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={p.status === "captured" ? "green" : p.status === "failed" ? "red" : "gray"}>{p.status}</Badge>
                  <span>{formatINR(Number(p.amount))}</span>
                  <span className="text-xs text-charcoal-muted">
                    {p.provider} {p.signature_verified ? "· signature verified" : ""} ·{" "}
                    {p.provider_payment_id ? <code className="font-mono">{p.provider_payment_id}</code> : new Date(p.created_at).toLocaleDateString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-lg text-charcoal">Timeline</h2>
          {history.length === 0 ? (
            <p className="text-sm text-charcoal-muted">Order placed — updates will appear here.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {history.map((h: any) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  <span className="font-medium capitalize">{String(h.to_status).replace(/_/g, " ")}</span>
                  <span className="text-xs text-charcoal-muted">
                    {new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <Link href="/account/orders" className="btn-ghost text-sm">← All orders</Link>
    </div>
  );
}
