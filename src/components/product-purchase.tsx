"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart-store";
import { formatINR, type ServiceAddon } from "@/lib/types-compat";
import type { CartProductHint } from "@/components/cart-buttons";

export function ProductPurchase(props: {
  product: CartProductHint;
  addons: ServiceAddon[];
  basePrice: number;
}) {
  const router = useRouter();
  const [qty, setQty] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const addonsTotal = props.addons.filter((a) => selected.includes(a.name)).reduce((s, a) => s + a.price, 0);
  const displayTotal = (props.basePrice + addonsTotal) * qty;

  function add(goCheckout: boolean) {
    addToCart({
      productId: props.product.id,
      name: props.product.name,
      slug: props.product.slug,
      kind: props.product.kind,
      price: props.basePrice + addonsTotal,
      quantity: qty,
      addons: selected,
    });
    if (goCheckout) router.push("/cart");
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      {props.addons.length ? (
        <fieldset>
          <legend className="label">Optional add-ons</legend>
          <div className="space-y-2">
            {props.addons.map((a) => (
              <label key={a.name} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E8DFCE] bg-cream px-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-burgundy"
                    checked={selected.includes(a.name)}
                    onChange={(e) =>
                      setSelected((cur) => (e.target.checked ? [...cur, a.name] : cur.filter((x) => x !== a.name)))
                    }
                  />
                  {a.name}
                </span>
                <span className="text-burgundy">+{formatINR(a.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center gap-4">
        <label htmlFor="qty" className="label mb-0">Qty</label>
        <div className="flex items-center rounded-full border border-[#E0D5C0] bg-cream">
          <button type="button" aria-label="Decrease quantity" className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <output id="qty" className="w-8 text-center text-sm">{qty}</output>
          <button type="button" aria-label="Increase quantity" className="px-3 py-2" onClick={() => setQty((q) => Math.min(10, q + 1))}>+</button>
        </div>
        <p className="text-sm text-charcoal-muted">
          Est. total <span className="font-serif text-lg text-burgundy">{formatINR(displayTotal)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-gold" onClick={() => add(false)}>Add to Cart</button>
        <button type="button" className="btn-burgundy" onClick={() => add(true)}>Buy Now</button>
      </div>
    </div>
  );
}
