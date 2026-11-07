import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, effectivePriceRupees, formatINR } from "@/lib/money";
import { mediaUrl } from "@/lib/media";
import { ProductArt } from "@/components/product-art";
import { Badge } from "@/components/ui";
import { AddToCartButton } from "@/components/cart-buttons";

export function ProductCard({ product }: { product: Product }) {
  const price = effectivePriceRupees(product);
  const off = discountPercent(product.price_original, price);
  const image = mediaUrl(product.thumbnail_path);
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-champagne">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <ProductArt
              name={product.name}
              kind={product.kind}
              className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "linear-gradient(160deg, rgba(255,255,255,0) 45%, rgba(110,30,44,0.10) 100%)" }}
            />
          </>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {off ? <Badge tone="gold">−{off}%</Badge> : null}
          {product.is_demo ? <Badge tone="gray">Demo</Badge> : null}
          {product.customization_enabled ? <Badge tone="blue">Customisable</Badge> : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.category ? (
          <p className="mb-1 text-xs uppercase tracking-widest text-charcoal-muted">{product.category.name}</p>
        ) : null}
        <h3 className="font-serif text-lg leading-snug text-charcoal">
          <Link href={`/products/${product.slug}`} className="hover:text-burgundy">
            {product.name}
          </Link>
        </h3>
        {product.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-charcoal-muted">{product.description}</p>
        ) : null}
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[1.35rem] leading-none text-burgundy">{formatINR(price)}</span>
            {off ? <span className="text-sm text-charcoal-muted line-through">{formatINR(product.price_original)}</span> : null}
            {product.delivery_estimate ? (
              <span className="ml-auto text-[11px] uppercase tracking-widest2 text-charcoal-muted">
                {product.delivery_estimate}
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 h-px w-full bg-gradient-to-r from-gold/40 via-gold/15 to-transparent" />
          <div className="mt-3 flex items-center gap-2">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                kind: product.kind,
                price,
                customizationEnabled: product.customization_enabled,
              }}
            />
            <Link
              href={`/products/${product.slug}`}
              className="btn-ghost px-4 py-2 text-xs group-hover:text-burgundy"
            >
              Details <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
