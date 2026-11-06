import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment not completed", robots: { index: false } };

export default function FailedPage({ searchParams }: { searchParams: { order?: string; reason?: string } }) {
  const reason =
    searchParams.reason === "cancelled"
      ? "The payment window was closed before completing."
      : "We could not verify the payment. If money was deducted, it will be confirmed automatically or refunded by Razorpay.";
  return (
    <div className="container-pad max-w-xl py-20 text-center">
      <div className="card p-8">
        <h1 className="font-serif text-3xl text-charcoal">Payment not completed</h1>
        {searchParams.order ? (
          <p className="mt-3 text-sm text-charcoal-muted">
            Order <span className="font-mono font-semibold text-charcoal">{searchParams.order}</span>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-charcoal-muted">{reason}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/checkout" className="btn-burgundy">Try again</Link>
          <Link href="/account/orders" className="btn-outline">My orders</Link>
        </div>
      </div>
    </div>
  );
}
