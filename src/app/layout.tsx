import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getBranding } from "@/lib/settings";
import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/db/storage";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const favicon = mediaUrl(branding.faviconPath) ?? undefined;
  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: branding.websiteTitle || `${branding.businessName} — Wedding Invitations`,
      template: `%s • ${branding.businessName}`,
    },
    description: branding.seoDescription,
    keywords: branding.seoKeywords,
    icons: favicon ? [{ url: favicon }] : undefined,
    openGraph: {
      title: branding.websiteTitle,
      description: branding.seoDescription,
      siteName: branding.businessName,
      type: "website",
      locale: branding.language === "ta" ? "ta_IN" : "en_IN",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  return (
    <html lang={branding.language === "ta" ? "ta" : "en"}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--brand-gold:${branding.primaryColor || "#B08D57"};--brand-accent:${branding.accentColor || "#6E1E2C"};}`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
