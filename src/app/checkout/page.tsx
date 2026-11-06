"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, readCart, type CartLine } from "@/lib/cart-store";
import { formatINR } from "@/lib/types-compat";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

interface CheckoutResponse {
  ok: boolean;
  error?: string;
  testMode?: boolean;
  orderId?: string;
  orderNumber?: string;
  note?: string;
  totals?: { subtotal: number; discount: number; tax: number; grand: number };
  razorpay?: { keyId: string; orderId: string; amountPaise: number };
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const [lines, setLines] = React.useState<CartLine[] | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [placed, setPlaced] = React.useState<CheckoutResponse | null>(null);
  const couponRef = React.useRef<string>("");

  React.useEffect(() => {
    setLines(readCart());
    couponRef.current = sessionStorage.getItem("wip_coupon") ?? "";
  }, []);

  if (lines === null) return <div className="container-pad py-16 text-center text-charcoal-muted">Loading…</div>;
  if (lines.length === 0 && !placed) {
    return (
      <div className="container-pad py-20 text-center">
        <h1 className="font-serif text-3xl text-charcoal">Nothing to checkout</h1>
        <Link href="/invitation-videos" className="btn-gold mt-6 inline-flex">Browse invitations</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines!.map((l) => ({ productId: l.productId, quantity: l.quantity, addons: l.addons, options: l.options })),
          couponCode: couponRef.current || undefined,
          customer: {
            name: String(fd.get("name") ?? ""),
            email: String(fd.get("email") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            address: String(fd.get("address") ?? ""),
          },
        }),
      });
      const data = (await res.json()) as CheckoutResponse;
      if (res.status === 401) {
        router.push("/login?next=/checkout");
        return;
      }
      if (!data.ok) {
        setServerError(data.error ?? "Could not place the order.");
        return;
      }

      if (data.testMode) {
        clearCart();
        sessionStorage.removeItem("wip_coupon");
        setPlaced(data);
        return;
      }

      // Live Razorpay flow
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay || !data.razorpay) {
        setServerError("Payment gateway failed to load. Your order is saved as Pending Payment — you can retry from My Orders.");
        setPlaced(data);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        amount: data.razorpay.amountPaise,
        currency: "INR",
        name: "Wedding Invitations",
        description: `Order ${data.orderNumber}`,
        order_id: data.razorpay.orderId,
        prefill: { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), contact: String(fd.get("phone") ?? "") },
        theme: { color: "#6E1E2C" },
        modal: { ondismiss: () => router.push(`/checkout/failed?order=${data.orderNumber}&reason=cancelled`) },
        handler: async (resp: Record<string, string>) => {
          const verify = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.orderId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          const v = await verify.json();
          if (verify.ok && v.ok) {
            clearCart();
            sessionStorage.removeItem("wip_coupon");
            router.push(`/checkout/success/${data.orderId}`);
          } else {
            router.push(`/checkout/failed?order=${data.orderNumber}&reason=verification`);
          }
        },
      });
      rzp.open();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <div className="container-pad max-w-xl py-20 text-center">
        <div className="card p-8">
          <p className="eyebrow">Order received</p>
          <h1 className="mt-2 font-serif text-3xl text-charcoal">Thank you!</h1>
          <p className="mt-4 text-sm text-charcoal-muted">
            Order <span className="font-mono font-semibold text-charcoal">{placed.orderNumber}</span> was placed.
          </p>
          {placed.testMode ? (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
              <p className="font-semibold">Payments are in TEST MODE</p>
              <p className="mt-1">
                Live Razorpay keys are not configured, so this order was saved as <strong>Pending Payment</strong> and no
                payment was charged. To activate live payments, add Razorpay keys to your environment and set
                PAYMENTS_TEST_MODE=false (see docs/RAZORPAY_SETUP.md).
              </p>
            </div>
          ) : null}
          {placed.totals ? (
            <p className="mt-5 text-sm text-charcoal-soft">
              Total: <span className="font-serif text-xl text-burgundy">{formatINR(placed.totals.grand)}</span>
              {placed.totals.discount ? <span className="ml-2 text-xs">(saved {formatINR(placed.totals.discount)})</span> : null}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/account/orders" className="btn-burgundy">Track in My Orders</Link>
            <Link href="/" className="btn-outline">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const estimated = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <div className="container-pad py-10 sm:py-14">
      <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <h2 className="font-serif text-xl text-charcoal">Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">Full name *</label>
              <input id="name" name="name" required maxLength={120} className="input" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="label">Email *</label>
              <input id="email" name="email" type="email" required maxLength={254} className="input" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="phone" className="label">Phone (WhatsApp preferred)</label>
              <input id="phone" name="phone" type="tel" maxLength={16} className="input" autoComplete="tel" placeholder="+91 …" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="label">Anything we should know? (optional)</label>
              <textarea id="address" name="address" rows={3} maxLength={1000} className="input" placeholder="Notes for the design team…" />
            </div>
          </div>
          {serverError ? (
            <p role="alert" className="rounded-xl border border-[#F0C9CE] bg-[#FBEFF0] px-4 py-3 text-sm text-burgundy">
              {serverError}
            </p>
          ) : null}
          <button type="submit" disabled={submitting} className="btn-burgundy w-full">
            {submitting ? "Placing order…" : "Place order & continue to payment"}
          </button>
          <p className="text-center text-xs text-charcoal-muted">
            Secure payment via Razorpay (UPI, cards, net-banking, wallets). We never see your card details.
          </p>
        </form>

        <aside className="card h-fit space-y-3 p-6">
          <h2 className="font-serif text-xl text-charcoal">Your order</h2>
          <ul className="space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span className="text-charcoal-soft">
                  {l.name} × {l.quantity}
                  {l.addons.length ? <span className="block text-xs text-charcoal-muted">+ {l.addons.join(", ")}</span> : null}
                </span>
                <span>{formatINR(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <hr className="border-[#E8DFCE]" />
          <div className="flex justify-between text-sm">
            <span className="text-charcoal-muted">Estimated subtotal</span>
            <span className="font-medium">{formatINR(estimated)}</span>
          </div>
          <p className="text-xs text-charcoal-muted">Exact totals (incl. coupon {couponRef.current ? `“${couponRef.current}”` : "—"}) are computed on the server.</p>
        </aside>
      </div>
    </div>
  );
}
