import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser, isAdminId } from "@/lib/auth";
import { getOrderById, listPaymentsForOrder } from "@/lib/db/orders";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/ui";
import { isTestMode } from "@/lib/razorpay";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

/**
 * Confirmation page displays the CURRENT database state only.
 * Viewing this page never marks anything paid — payment status changes only
 * via signature-verified callbacks or webhooks.
 */
export default async function SuccessPage({ params }: { params: { orderId: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="container-pad py-20 text-center">
        <h1 className="font-serif text-3xl">Please sign in</h1>
        <Link href="/login" className="btn-gold mt-6 inline-flex">Sign in</Link>
      </div>
    );
  }
  const order = await getOrderById(params.orderId);
  const admin = await isAdminId(user.id);
  if (!order || (order.user_id !== user.id && !admin)) notFound();
  const payments = await listPaymentsForOrder(order.id);
  const payment = payments.find((p) => p.status === "captured");

  return (
    <div className="container-pad max-w-2xl py-14">
      <div className="card p-8">
        <p className="eyebrow">Order {order.order_number}</p>
        <h1 className="mt-2 font-serif text-3xl text-charcoal">
          {order.payment_status === "paid" ? "Payment confirmed — thank you!" : "Order received"}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm text-charcoal-muted">
            Payment: <strong className={order.payment_status === "paid" ? "text-[#2F6B38]" : "text-amber-700"}>{order.payment_status}</strong>
          </span>
        </div>

        {order.payment_status !== "paid" ? (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {isTestMode() ? (
              <>
                <strong>Test mode:</strong> no live payment was taken. This order becomes active once the team records a
                verified payment (UPI/bank transfer reference) in the admin dashboard.
              </>
            ) : (
              <>Your payment has not been confirmed yet. If you completed payment, it updates automatically within a minute.</>
            )}
          </div>
        ) : null}

        <table className="mt-6 w-full text-sm">
          <tbody>
            {(order.items ?? []).map((i) => (
              <tr key={i.id} className="border-b border-[#EFE7D6] last:border-0">
                <td className="py-2.5 text-charcoal-soft">
                  {i.product_name} × {i.quantity}
                </td>
                <td className="py-2.5 text-right">{formatINR(Number(i.total))}</td>
              </tr>
            ))}
            {Number(order.discount_total) > 0 ? (
              <tr>
                <td className="py-2.5 text-charcoal-muted">Discount ({order.coupon_code})</td>
                <td className="py-2.5 text-right text-[#2F6B38]">−{formatINR(Number(order.discount_total))}</td>
              </tr>
            ) : null}
            {Number(order.tax_total) > 0 ? (
              <tr>
                <td className="py-2.5 text-charcoal-muted">Tax</td>
                <td className="py-2.5 text-right">{formatINR(Number(order.tax_total))}</td>
              </tr>
            ) : null}
            <tr>
              <td className="py-3 font-serif text-lg">Total</td>
              <td className="py-3 text-right font-serif text-lg text-burgundy">{formatINR(Number(order.grand_total))}</td>
            </tr>
          </tbody>
        </table>

        {payment ? (
          <p className="mt-4 text-xs text-charcoal-muted">
            Payment reference: <code className="font-mono">{payment.provider_payment_id ?? payment.id}</code>
            {payment.signature_verified ? " (signature verified)" : ""}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {(order.items ?? []).some((i) => i.kind === "website" || i.kind === "card") ? (
            <Link href="/account/customizations" className="btn-gold">Personalise your invitation</Link>
          ) : null}
          <Link href="/account/orders" className="btn-outline">My orders</Link>
          <Link href="/" className="btn-ghost">Home</Link>
        </div>
      </div>
    </div>
  );
}
