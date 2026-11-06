/** Shared domain types (database rows + payloads). Kept hand-written & strict. */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Role = "admin" | "editor" | "support" | "customer";

export type ProductKind = "video" | "website" | "card" | "quote" | "service" | "other";
export type ProductStatus = "draft" | "published" | "archived" | "unavailable";
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_progress"
  | "awaiting_info"
  | "ready_for_review"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type CouponKind = "percent" | "fixed";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  kind: ProductKind;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceAddon {
  name: string;
  price: number; // rupees
}

export interface CustomField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "color" | "select" | "image" | "url" | "checkbox";
  required?: boolean;
  options?: string[]; // for select
  maxLength?: number;
  help?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  kind: ProductKind;
  category_id: string | null;
  tags: string[];
  description: string | null;
  long_description: string | null;
  thumbnail_path: string | null;
  preview_video_path: string | null;
  demo_url: string | null;
  price_original: number;
  price_selling: number;
  price_sale: number | null;
  customization_fee: number;
  extra_revision_fee: number;
  tax_rate: number | null; // percent override, null => global setting
  customization_enabled: boolean;
  customization_schema: CustomField[];
  service_addons: ServiceAddon[];
  related_ids: string[];
  delivery_estimate: string | null;
  revision_policy: string | null;
  license_terms: string | null;
  status: ProductStatus;
  is_featured: boolean;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  media?: ProductMedia[];
}

export interface ProductMedia {
  id: string;
  product_id: string;
  kind: "image" | "video";
  path: string;
  alt: string | null;
  sort_order: number;
}

export interface Theme {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  preview_image_path: string | null;
  demo_url: string | null;
  price: number | null;
  tags: string[];
  config: Json;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  min_purchase: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  first_order_only: boolean;
  applies_to: "all" | "product" | "category";
  product_ids: string[];
  category_ids: string[];
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  customer: Json;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  coupon_code: string | null;
  currency: string;
  notes_internal: string | null;
  notes_customer: string | null;
  placed_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  kind: ProductKind;
  unit_price: number;
  quantity: number;
  addons_total: number;
  tax_rate: number;
  total: number;
  options: Json;
  deliverable_path: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: "razorpay" | "manual";
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "captured" | "failed" | "refunded" | "partially_refunded";
  method: string | null;
  signature_verified: boolean;
  created_at: string;
}

export interface Customization {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string | null;
  title: string;
  slug: string;
  config: Record<string, Json>;
  status: "draft" | "published" | "archived";
  version: number;
  order_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  text: string;
  text_ta: string | null;
  author: string | null;
  category: string;
  is_published: boolean;
  sort_order: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  is_published: boolean;
  updated_at: string;
}

export interface OfferBanner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_path: string | null;
  coupon_code: string | null;
  placement: "announcement" | "hero_strip" | "banner";
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high";
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  meta: Json;
  created_at: string;
}

/* ------------------------- Settings shapes ------------------------- */

export interface BrandingSettings {
  businessName: string;
  tagline: string;
  logoPath: string | null;
  faviconPath: string | null;
  primaryColor: string; // gold
  accentColor: string; // burgundy
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  youtube: string;
  twitter: string;
  currency: string; // ISO, default INR
  country: string;
  language: string; // default "en", optional "ta"
  websiteTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export interface HomepageSection {
  id:
    | "hero"
    | "featured_videos"
    | "featured_websites"
    | "digital_cards"
    | "trending_themes"
    | "new_arrivals"
    | "best_sellers"
    | "offers"
    | "custom_services"
    | "how_it_works"
    | "faqs"
    | "newsletter";
  enabled: boolean;
}

export interface HomepageSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImagePath: string | null;
  heroVideoUrl: string;
  heroCtaLabel: string;
  heroCtaUrl: string;
  heroCta2Label: string;
  heroCta2Url: string;
  announcement: string;
  announcementEnabled: boolean;
  announcementUrl: string;
  footerText: string;
  sectionOrder: HomepageSection[];
}

export interface RegionalSettings {
  currency: string;
  taxRate: number; // percent, default 0
  country: string;
  language: string;
}

export interface PaymentSettingsView {
  provider: string;
  mode: "test" | "live";
  keyIdConfigured: boolean;
  webhookConfigured: boolean;
}

export interface EmailSettingsView {
  provider: string;
  from: string;
  configured: boolean;
}
