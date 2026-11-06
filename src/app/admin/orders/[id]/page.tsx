import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById, listPaymentsForOrder, listStatusHistory, PAID_STATUSES } from "@/lib/db/orders";
import {
  cancelOrderAction,
  recordManualPaymentAction,
  recordRefundAction,
  updateOrderNotesAction,
  updateOrderStatusAction,
} from "../../actions-orders";
import { Badge, ConfirmSubmitButton } from "@/components/ui";
import { DeliverableUpload } from "@/components/admin/deliverable-upload";
import { formatINR } from "@/lib/money";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_progress",
  "awaiting_info",
  "ready_for_review",
  "delivered",
  "cancelled",
  "refunded",
];

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  const order = await getOrderById(params.id);
  if (!order) notFound();
  const [payments, history] = await Promise.all([
    listPaymentsForOrder(order.id),
    listStatusHistory(order.id),
  ]);

  const isPaid = PAID_STATUSES.includes(order.status);
  const canRecordManual = order.status === "pending_payment" && order.payment_status !== "paid";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="btn-ghost px-2 py-1 text-sm">← Orders</Link>
        <h2 className="font-serif text-2xl text-charcoal">{order.order_number}</h2>
        <Badge tone={order.status === "delivered" ? "green" : order.status === "pending_payment" ? "amber" : order.status === "cancelled" || order.status === "refunded" ? "red" : "blue"}>
          {order.status.replace(/_/g, " ")}
        </Badge>
        <Badge tone={order.payment_status === "paid" ? "green" : "gray"}>{order.payment_status}</Badge>
      </div>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy" role="alert">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Saved.</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + delivery */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h3 className="font-serif text-lg text-charcoal">Items</h3>
            <ul className="mt-4 space-y-4">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="rounded-xl border border-[#EFE7D6] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-charcoal-muted">
                        {item.kind} · qty {item.quantity} · unit {formatINR(item.unit_price)}
                        {Number(item.addons_total) > 0 ? ` · add-ons ${formatINR(item.addons_total)}` : ""}
                        {item.tax_rate ? ` · tax ${item.tax_rate}%` : ""}
                      </p>
                    </div>
                    <p className="font-medium">{formatINR(item.total)}</p>
                  </div>
                  {isPaid ? (
                    <div className="mt-3 border-t border-[#F5EFE3] pt-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">Deliverable (private)</p>
                      <DeliverableUpload itemId={item.id} current={item.deliverable_path} />
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-[#F5EFE3] pt-3 text-xs italic text-charcoal-muted">
                      Deliverables unlock once payment is confirmed.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-1 border-t border-[#EFE7D6] pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {Number(order.discount_total) > 0 ? (
                <div className="flex justify-between text-[#2F6B38]"><dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>−{formatINR(order.discount_total)}</dd></div>
              ) : null}
              {Number(order.tax_total) > 0 ? <div className="flex justify-between"><dt>Tax</dt><dd>{formatINR(order.tax_total)}</dd></div> : null}
              <div className="flex justify-between border-t border-[#EFE7D6] pt-2 text-base font-semibold"><dt>Grand total</dt><dd>{formatINR(order.grand_total)}</dd></div>
            </dl>
          </div>

          {/* Payments */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-charcoal">Payments</h3>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal-muted">No payment attempts recorded.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-[#EFE7D6] p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{formatINR(p.amount)}</span>
                      <Badge tone={p.status === "captured" ? "green" : p.status === "failed" ? "red" : p.status.includes("refunded") ? "amber" : "gray"}>{p.status}</Badge>
                      <span className="text-xs capitalize text-charcoal-muted">{p.provider}{p.method ? ` · ${p.method}` : ""}</span>
                      {p.provider === "razorpay" ? (
                        <span className={`text-xs ${p.signature_verified ? "text-[#2F6B38]" : "text-burgundy"}`}>
                          signature {p.signature_verified ? "verified ✓" : "NOT verified ✗"}
                        </span>
                      ) : null}
                    </div>
                    {p.provider_payment_id ? <p className="mt-1 font-mono text-xs text-charcoal-muted">{p.provider_payment_id}</p> : null}
                    {p.status === "captured" ? (
                      <form action={recordRefundAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[#F5EFE3] pt-3">
                        <input type="hidden" name="payment_id" value={p.id} />
                        <input type="hidden" name="order_id" value={order.id} />
                        <div>
                          <label className="label" htmlFor={`amt-${p.id}`}>Refund amount (₹, max {formatINR(p.amount)})</label>
                          <input id={`amt-${p.id}`} name="amount" type="number" step="0.01" min="0.01" max={p.amount} defaultValue={p.amount} className="input w-36" />
                        </div>
                        <div className="min-w-[200px] flex-1">
                          <label className="label" htmlFor={`rsn-${p.id}`}>Reason *</label>
                          <input id={`rsn-${p.id}`} name="reason" required maxLength={300} className="input" />
                        </div>
                        <button className="btn-outline px-4 py-2 text-xs">Record refund</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-charcoal">Status history</h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-charcoal-muted">No transitions recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {(history as Array<{ id: string; from_status: string; to_status: string; note: string | null; created_at: string; changed_by: string | null }>).map((h) => (
                  <li key={h.id} className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs text-charcoal-muted">{new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span>{h.from_status.replace(/_/g, " ")} → <strong>{h.to_status.replace(/_/g, " ")}</strong></span>
                    {h.note ? <span className="text-xs italic text-charcoal-muted">({h.note})</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-serif text-lg text-charcoal">Customer</h3>
            <p className="mt-2 text-sm">{order.email}</p>
            {order.phone ? <p className="text-sm">{order.phone}</p> : null}
            <p className="mt-2 text-xs text-charcoal-muted">Placed {new Date(order.placed_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</p>
            {order.paid_at ? <p className="text-xs text-[#2F6B38]">Paid {new Date(order.paid_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</p> : null}
            {order.user_id ? (
              <Link href={`/admin/customers?q=${encodeURIComponent(order.email)}`} className="mt-2 inline-block text-xs text-burgundy underline">View customer →</Link>
            ) : (
              <p className="mt-2 text-xs italic text-charcoal-muted">Guest checkout (no account)</p>
            )}
          </div>

          <form action={updateOrderStatusAction} className="card space-y-3 p-6">
            <input type="hidden" name="id" value={order.id} />
            <h3 className="font-serif text-lg text-charcoal">Update status</h3>
            <label className="label" htmlFor="status">New status</label>
            <select id="status" name="status" defaultValue={order.status} className="input">
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <label className="label" htmlFor="note">Note (visible in history)</label>
            <input id="note" name="note" maxLength={1000} className="input" placeholder="Optional" />
            <p className="text-xs text-charcoal-muted">Customer gets an email for in-progress, needs-info, ready &amp; delivered updates.</p>
            <button className="btn-burgundy px-4 py-2 text-sm">Apply status</button>
          </form>

          <form action={updateOrderNotesAction} className="card space-y-3 p-6">
            <input type="hidden" name="id" value={order.id} />
            <h3 className="font-serif text-lg text-charcoal">Notes</h3>
            <label className="label" htmlFor="notes_internal">Internal (admin only)</label>
            <textarea id="notes_internal" name="notes_internal" rows={2} maxLength={4000} defaultValue={order.notes_internal ?? ""} className="input" />
            <label className="label" htmlFor="notes_customer">Customer-visible note</label>
            <textarea id="notes_customer" name="notes_customer" rows={2} maxLength={4000} defaultValue={order.notes_customer ?? ""} className="input" />
            <button className="btn-outline px-4 py-2 text-sm">Save notes</button>
          </form>

          {canRecordManual ? (
            <form action={recordManualPaymentAction} className="card space-y-3 border-2 border-[#C9B86A] p-6">
              <input type="hidden" name="id" value={order.id} />
              <h3 className="font-serif text-lg text-charcoal">Record offline payment</h3>
              <p className="text-xs text-charcoal-muted">
                Use only after money actually arrived (bank transfer / UPI / cash). This marks the order PAID and emails the customer. <strong>Exact total required: {formatINR(order.grand_total)}</strong>
              </p>
              <label className="label" htmlFor="mp-amount">Amount received (₹) *</label>
              <input id="mp-amount" name="amount" type="number" step="0.01" min="0.01" required className="input" />
              <label className="label" htmlFor="mp-ref">Reference (UPI txn / bank ref) *</label>
              <input id="mp-ref" name="reference" required maxLength={120} className="input" />
              <label className="label" htmlFor="mp-method">Method</label>
              <input id="mp-method" name="method" maxLength={60} defaultValue="upi_offline" className="input" />
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" name="confirm" required className="mt-0.5 accent-burgundy" />
                I confirm this payment has actually been received.
              </label>
              <button className="btn-burgundy px-4 py-2 text-sm">Mark as paid</button>
            </form>
          ) : null}

          {order.status !== "cancelled" && order.status !== "refunded" ? (
            <div className="card border border-[#E7C6CB] p-6">
              <h3 className="font-serif text-lg text-burgundy">Danger zone</h3>
              {isPaid ? (
                <p className="mt-2 text-xs text-charcoal-muted">Paid orders cannot be hard-cancelled. Record a refund above; the order moves to refunded.</p>
              ) : null}
              <form className="mt-3">
                <input type="hidden" name="id" value={order.id} />
                <ConfirmSubmitButton
                  label="Cancel order"
                  confirmText={`Cancel ${order.order_number}?${isPaid ? " Paid orders are refused — refund instead." : ""}`}
                  className="btn-outline border-burgundy px-4 py-2 text-xs text-burgundy"
                  formAction={cancelOrderAction}
                />
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
