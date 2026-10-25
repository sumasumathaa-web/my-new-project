/**
 * Database-backed, admin-editable site settings (branding, homepage, regional,
 * footer...). Public pages always read from here — no brand name is hardcoded.
 */
import { cache } from "react";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import type { BrandingSettings, HomepageSettings, RegionalSettings } from "@/lib/types";

export const SETTINGS_KEYS = {
  branding: "branding",
  homepage: "homepage",
  regional: "regional",
  footer: "footer",
  seo: "seo",
} as const;

export const DEFAULT_BRANDING: BrandingSettings = {
  businessName: "Your Brand Name",
  tagline: "Timeless digital wedding invitations",
  logoPath: null,
  faviconPath: null,
  primaryColor: "#B08D57",
  accentColor: "#6E1E2C",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  instagram: "",
  facebook: "",
  youtube: "",
  twitter: "",
  currency: "INR",
  country: "IN",
  language: "en",
  websiteTitle: "Your Brand Name — Wedding Invitations",
  seoDescription: "Premium wedding invitation videos, websites and digital cards.",
  seoKeywords: "wedding invitation video, wedding website, digital wedding card, tamil wedding invitation",
};

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  heroTitle: "Invitations as memorable as the day itself",
  heroSubtitle:
    "Handcrafted wedding invitation videos, bespoke wedding websites and elegant digital cards — delivered fast, personalised completely.",
  heroImagePath: null,
  heroVideoUrl: "",
  heroCtaLabel: "Browse Invitations",
  heroCtaUrl: "/invitation-videos",
  heroCta2Label: "Custom Design",
  heroCta2Url: "/custom-design",
  announcement: "",
  announcementEnabled: false,
  announcementUrl: "",
  footerText: "Crafted with love for your special day.",
  sectionOrder: [
    { id: "hero", enabled: true },
    { id: "featured_videos", enabled: true },
    { id: "featured_websites", enabled: true },
    { id: "digital_cards", enabled: true },
    { id: "trending_themes", enabled: true },
    { id: "new_arrivals", enabled: true },
    { id: "best_sellers", enabled: true },
    { id: "offers", enabled: true },
    { id: "custom_services", enabled: true },
    { id: "how_it_works", enabled: true },
    { id: "faqs", enabled: true },
    { id: "newsletter", enabled: true },
  ],
};

export const DEFAULT_REGIONAL: RegionalSettings = {
  currency: "INR",
  taxRate: 0, // charge GST here (e.g. 18) when your business requires it
  country: "IN",
  language: "en",
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const sb = safeServiceSupabase();
  if (!sb) return fallback;
  try {
    const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
    if (!data?.value) return fallback;
    return { ...fallback, ...(data.value as Partial<T>) };
  } catch {
    return fallback;
  }
}

/** Cached per-request: layout + pages share one DB read. */
export const getBranding = cache(async (): Promise<BrandingSettings> => {
  return getSetting<BrandingSettings>(SETTINGS_KEYS.branding, DEFAULT_BRANDING);
});

export const getHomepage = cache(async (): Promise<HomepageSettings> => {
  return getSetting<HomepageSettings>(SETTINGS_KEYS.homepage, DEFAULT_HOMEPAGE);
});

export const getRegional = cache(async (): Promise<RegionalSettings> => {
  return getSetting<RegionalSettings>(SETTINGS_KEYS.regional, DEFAULT_REGIONAL);
});

export async function saveSetting(key: string, value: unknown, actorUserId: string | null): Promise<void> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { error } = await sb
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: actorUserId }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
