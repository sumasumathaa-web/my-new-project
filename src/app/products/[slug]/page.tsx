import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/catalog";
import { discountPercent, effectivePriceRupees, formatINR } from "@/lib/money";
import { mediaUrl } from "@/lib/db/storage";
import { ProductArt } from "@/components/product-art";
import { Badge, SectionHeading } from "@/components/ui";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductGrid } from "@/components/product-card";
import { WishlistButton } from "@/components/wishlist-button";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product not found" };
  const image = mediaUrl(product.thumbnail_path);
  return {
    title: product.name,
    description: product.description ?? undefined,
    alternates: { canonical: `${env.siteUrl}/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);
  const price = effectivePriceRupees(product);
  const off = discountPercent(product.price_original, price);
  const images = [
    product.thumbnail_path,
    ...(product.media ?? []).filter((m) => m.kind === "image").map((m) => m.path),
  ].filter(Boolean) as string[];
  const previewVideo = mediaUrl(product.preview_video_path);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images[0] ? mediaUrl(images[0]) : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: price,
      availability: "https://schema.org/InStock",
      url: `${env.siteUrl}/products/${product.slug}`,
    },
  };

  return (
    <div className="container-pad py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-charcoal-muted">
        <Link href="/" className="hover:text-burgundy">Home</Link> /{" "}
        {product.category ? (
          <>
            <Link href={`/${product.kind === "video" ? "invitation-videos" : product.kind === "website" ? "invitation-websites" : product.kind === "card" ? "digital-cards" : "search"}`} className="hover:text-burgundy">
              {product.category.name}
            </Link>{" "}
            /{" "}
          </>
        ) : null}
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="card overflow-hidden">
            {previewVideo ? (
              <video controls playsInline preload="metadata" className="w-full" src={previewVideo} />
            ) : images.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(images[0])!} alt={product.name} className="w-full object-cover" />
            ) : (
              <ProductArt name={product.name} kind={product.kind} className="w-full" />
            )}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {images.slice(1, 5).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img} src={mediaUrl(img)!} alt="" loading="lazy" className="h-20 w-full rounded-xl border border-[#E8DFCE] object-cover" />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.tags.slice(0, 4).map((t) => (
              <Badge key={t} tone="gray">{t}</Badge>
            ))}
            {product.is_demo ? <Badge tone="amber">Demo product</Badge> : null}
          </div>
          <h1 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">{product.name}</h1>
          {product.description ? <p className="mt-3 leading-relaxed text-charcoal-muted">{product.description}</p> : null}

          <div className="mt-5 flex items-end gap-3">
            <span className="font-serif text-3xl text-burgundy">{formatINR(price)}</span>
            {off ? (
              <>
                <span className="text-charcoal-muted line-through">{formatINR(product.price_original)}</span>
                <Badge tone="gold">Save {off}%</Badge>
              </>
            ) : null}
          </div>

          <hr className="my-6 border-[#E8DFCE]" />
          <ProductPurchase
            basePrice={price}
            addons={Array.isArray(product.service_addons) ? product.service_addons : []}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              kind: product.kind,
              price,
              customizationEnabled: product.customization_enabled,
            }}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <WishlistButton productId={product.id} />
            {product.demo_url ? (
              <a href={product.demo_url} target="_blank" rel="noreferrer" className="btn-outline">View live demo</a>
            ) : null}
            {product.customization_enabled ? (
              <Link href={`/account/customizations/new?product=${product.slug}`} className="btn-ghost">
                Start personalising →
              </Link>
            ) : null}
          </div>

          <dl className="mt-8 grid gap-4 rounded-2xl border border-[#E8DFCE] bg-cream p-5 text-sm sm:grid-cols-2">
            {product.delivery_estimate ? (
              <div><dt className="text-charcoal-muted">Delivery</dt><dd className="font-medium">{product.delivery_estimate}</dd></div>
            ) : null}
            {product.revision_policy ? (
              <div><dt className="text-charcoal-muted">Revisions</dt><dd className="font-medium">{product.revision_policy}</dd></div>
            ) : null}
            {product.license_terms ? (
              <div><dt className="text-charcoal-muted">License</dt><dd className="font-medium">{product.license_terms}</dd></div>
            ) : null}
          </dl>
        </div>
      </div>

      {product.long_description ? (
        <section className="prose-sm sm:prose mx-auto mt-14 max-w-3xl">
          <SectionHeading eyebrow="About this design" title="Details" />
          <p className="whitespace-pre-line leading-relaxed text-charcoal-soft">{product.long_description}</p>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-16">
          <SectionHeading eyebrow="You may also love" title="Related invitations" />
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  );
}
