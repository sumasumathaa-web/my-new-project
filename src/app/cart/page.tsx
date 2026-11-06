"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, readCart, removeFromCart, setQuantity, type CartLine } from "@/lib/cart-store";
import { formatINR } from "@/lib/types-compat";

export default function CartPage() {
  const router = useRouter();
  const [lines, setLines] = React.useState<CartLine[] | null>(null);
  const [coupon, setCoupon] = React.useState("");
  const [couponMsg, setCouponMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    setLines(readCart());
  }, []);

  if (lines === null) {
    return <div className="container-pad py-16 text-center text-charcoal-muted">Loading your cart…</div>;
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function checkCoupon() {
    if (!coupon.trim() || !lines) return;
    setChecking(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: coupon,
          lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, addons: l.addons })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCouponMsg({ ok: true, text: `Applied: you save ${formatINR(data.discount)} (server-verified total ${formatINR(data.grand)})` });
        sessionStorage.setItem("wip_coupon", data.code);
      } else {
        setCouponMsg({ ok: false, text: data.reason ?? data.error ?? "Coupon not valid." });
        sessionStorage.removeItem("wip_coupon");
      }
    } catch {
      setCouponMsg({ ok: false, text: "Could not validate right now." });
    } finally {
      setChecking(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="container-pad py-20 text-center">
        <h1 className="font-serif text-3xl text-charcoal">Your cart is empty</h1>
        <p className="mt-3 text-charcoal-muted">Beautiful invitations await.</p>
        <Link href="/invitation-videos" className="btn-gold mt-6 inline-flex">Browse invitations</Link>
      </div>
    );
  }

  return (
    <div className="container-pad py-10 sm:py-14">
      <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {lines.map((l) => (
            <div key={l.productId} className="card flex flex-wrap items-center gap-4 p-4">
              <Link href={`/products/${l.slug}`} className="font-serif text-lg text-charcoal hover:text-burgundy">
                {l.name}
              </Link>
              {l.addons.length ? (
                <p className="w-full text-xs text-charcoal-muted">Add-ons: {l.addons.join(", ")}</p>
              ) : null}
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center rounded-full border border-[#E0D5C0] bg-cream">
                  <button
                    aria-label="Decrease quantity"
                    className="px-3 py-1.5"
                    onClick={() => setLines(setQuantity(l.productId, l.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm">{l.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    className="px-3 py-1.5"
                    onClick={() => setLines(setQuantity(l.productId, l.quantity + 1))}
                  >
                    +
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-medium">{formatINR(l.price * l.quantity)}</span>
                <button
                  className="text-xs text-burgundy underline underline-offset-2"
                  onClick={() => setLines(removeFromCart(l.productId))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button className="text-xs text-charcoal-muted underline" onClick={() => { clearCart(); setLines([]); }}>
            Clear cart
          </button>
        </div>

        <aside className="card h-fit space-y-4 p-6">
          <h2 className="font-serif text-xl text-charcoal">Summary</h2>
          <div className="flex justify-between text-sm text-charcoal-soft">
            <span>Estimated subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <p className="text-xs text-charcoal-muted">
            Prices, coupons and taxes are recalculated securely on the server at checkout.
          </p>
          <div>
            <label htmlFor="coupon" className="label">Coupon code</label>
            <div className="flex gap-2">
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                className="input flex-1 font-mono"
                placeholder="WELCOME10"
              />
              <button type="button" className="btn-outline px-4 py-2 text-xs" disabled={checking} onClick={checkCoupon}>
                {checking ? "…" : "Apply"}
              </button>
            </div>
            {couponMsg ? (
              <p role="status" className={`mt-2 text-xs ${couponMsg.ok ? "text-[#2F6B38]" : "text-burgundy"}`}>
                {couponMsg.text}
              </p>
            ) : null}
          </div>
          <button className="btn-burgundy w-full" onClick={() => router.push("/checkout")}>
            Proceed to checkout
          </button>
          <Link href="/invitation-videos" className="block text-center text-xs text-charcoal-muted underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
