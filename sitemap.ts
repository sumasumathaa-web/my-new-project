import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listProducts } from "@/lib/db/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPaths = [
    "",
    "/invitation-videos",
    "/invitation-websites",
    "/digital-cards",
    "/engagement-invitations",
    "/reception-invitations",
    "/save-the-date",
    "/themes",
    "/quotes",
    "/custom-design",
    "/offers",
    "/contact",
    "/about",
    "/faqs",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
    "/license",
    "/delivery-policy",
  ].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));

  const { items } = await listProducts({ pageSize: 200 });
  const productPaths = items.map((p) => ({
    url: `${base}/products/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...staticPaths, ...productPaths];
}
