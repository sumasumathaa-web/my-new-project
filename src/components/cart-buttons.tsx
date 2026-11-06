"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { addToCart, cartCount, onCartChange } from "@/lib/cart-store";

export interface CartProductHint {
  id: string;
  name: string;
  slug: string;
  kind: string;
  price: number;
  customizationEnabled: boolean;
}

export function AddToCartButton({ product }: { product: CartProductHint }) {
  const router = useRouter();
  const [added, setAdded] = React.useState(false);
  return (
    <button
      type="button"
      className="btn-gold px-4 py-2 text-xs"
      onClick={() => {
        addToCart({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          kind: product.kind,
          price: product.price,
          quantity: 1,
          addons: [],
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
        if (product.customizationEnabled) {
          // Customizable products still add cleanly; details collected at checkout/account.
        }
        router.refresh();
      }}
    >
      {added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}

export function CartBadge() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    setCount(cartCount());
    return onCartChange(() => setCount(cartCount()));
  }, []);
  return (
    <a href="/cart" className="link-underline relative" aria-label={`Cart with ${count} items`}>
      Cart
      {count > 0 ? (
        <span className="absolute -right-4 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[10px] font-bold text-cream">
          {count}
        </span>
      ) : null}
    </a>
  );
}
