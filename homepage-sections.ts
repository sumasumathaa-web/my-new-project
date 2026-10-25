/** Human labels for homepage sections (admin editor only). ids come from DEFAULT_HOMEPAGE in settings.ts. */
export const HOMEPAGE_SECTION_LABELS: Record<string, string> = {
  hero: "Hero banner",
  featured_videos: "Featured invitation videos",
  featured_websites: "Featured wedding websites",
  digital_cards: "Digital card designs",
  trending_themes: "Trending themes",
  new_arrivals: "New arrivals",
  best_sellers: "Best sellers",
  offers: "Offers & coupons",
  custom_services: "Custom design services",
  how_it_works: "How it works",
  faqs: "FAQs",
  newsletter: "Newsletter signup",
};

export const HOMEPAGE_SECTION_IDS = [
  "hero", "featured_videos", "featured_websites", "digital_cards", "trending_themes",
  "new_arrivals", "best_sellers", "offers", "custom_services", "how_it_works", "faqs", "newsletter",
] as const;
