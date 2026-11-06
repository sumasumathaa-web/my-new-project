import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listWishlistProducts } from "@/lib/db/customers";
import { EmptyState } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { WishlistRemoveButton } from "@/components/wishlist-button";
import type { Product } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await requireUser("/account/favorites");
  const rows = await listWishlistProducts(user.id);
  const products: Product[] = rows.flatMap((r: any) => {
    const joined = (r as { product?: Product | Product[] }).product;
    const p = Array.isArray(joined) ? joined[0] : joined;
    return p && p.status === "published" ? [p] : [];
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-charcoal">Favorites & wishlist</h1>
      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your wishlist is empty"
            message="Tap ♡ Wishlist on any product you love."
            action={<Link href="/invitation-videos" className="btn-gold">Find inspiration</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="space-y-2">
              <ProductCard product={p} />
              <WishlistRemoveButton productId={p.id} initialSaved />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
