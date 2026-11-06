"use server";

/**
 * Admin catalog mutations: products, categories, themes, quotes, FAQs,
 * content pages, coupons, offer banners.
 * Every action re-checks admin rights server-side and writes an audit record.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import {
  optionalString,
  parseStringArray,
  requireEnum,
  requireString,
  slugify,
  toBoolean,
  toInt,
  toRupeeNumber,
  ValidationError,
} from "@/lib/validation";
import type { ProductKind, ProductStatus } from "@/lib/types";

const KINDS: ProductKind[] = ["video", "website", "card", "quote", "service", "other"];
const STATUSES: ProductStatus[] = ["draft", "published", "archived", "unavailable"];

function adminFail(e: unknown, path: string): never {
  const msg = e instanceof Error ? e.message : "Operation failed";
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

function ok(path: string, key = "saved") {
  revalidatePath("/", "layout");
  redirect(`${path}?${key}=1`);
}

function parseJsonArray(raw: FormDataEntryValue | null, field: string): unknown[] {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new ValidationError(`${field} must be a valid JSON array.`, field);
  }
}

/* ------------------------------- PRODUCTS -------------------------------- */
export async function upsertProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = optionalString(formData.get("id"), "id");
  const back = id ? `/admin/products/${id}` : "/admin/products/new";
  try {
    const name = requireString(formData.get("name"), "Name", { max: 160 });
    let slug = optionalString(formData.get("slug"), "slug");
    slug = slug ? slugify(slug) : slugify(name);
    if (!slug) throw new ValidationError("Slug could not be derived.", "slug");

    const kind = requireEnum(formData.get("kind"), KINDS, "Kind");
    const status = requireEnum(formData.get("status"), STATUSES, "Status");
    const categoryId = optionalString(formData.get("category_id"), "category") || null;
    const priceOriginal = toRupeeNumber(formData.get("price_original"), "Original price", { max: 10_000_000 });
    const priceSelling = toRupeeNumber(formData.get("price_selling"), "Selling price", { min: 0.01, max: 10_000_000 });
    const priceSaleRaw = formData.get("price_sale");
    const priceSale = priceSaleRaw === null || String(priceSaleRaw).trim() === "" ? null : toRupeeNumber(priceSaleRaw, "Sale price", { max: 10_000_000 });
    if (priceOriginal > 0 && priceSelling > priceOriginal) {
      throw new ValidationError("Selling price cannot exceed the original price.", "price_selling");
    }
    if (priceSale !== null && priceSale >= priceSelling) {
      throw new ValidationError("Sale price must be lower than the selling price.", "price_sale");
    }

    const customizationSchema = parseJsonArray(formData.get("customization_schema"), "Customization fields");
    const serviceAddons = parseJsonArray(formData.get("service_addons"), "Service add-ons");
    for (const a of serviceAddons) {
      const addon = a as { name?: string; price?: number };
      if (!addon?.name || !Number.isFinite(Number(addon?.price)) || Number(addon.price) < 0) {
        throw new ValidationError('Add-ons must look like [{"name":"Priority delivery","price":199}].', "service_addons");
      }
    }

    const payload = {
      name,
      slug,
      kind,
      status,
      category_id: categoryId,
      tags: parseStringArray(String(formData.get("tags") ?? "").split(","), { max: 20 }),
      description: optionalString(formData.get("description"), "Description", { max: 500 }),
      long_description: optionalString(formData.get("long_description"), "Long description", { max: 8000 }),
      thumbnail_path: optionalString(formData.get("thumbnail_path"), "Thumbnail", { max: 400 }),
      preview_video_path: optionalString(formData.get("preview_video_path"), "Preview video", { max: 400 }),
      demo_url: optionalString(formData.get("demo_url"), "Demo URL", { max: 400 }),
      price_original: priceOriginal,
      price_selling: priceSelling,
      price_sale: priceSale,
      customization_fee: toRupeeNumber(formData.get("customization_fee") ?? "0", "Customization fee"),
      extra_revision_fee: toRupeeNumber(formData.get("extra_revision_fee") ?? "0", "Extra revision fee"),
      tax_rate: formData.get("tax_rate") === "" || formData.get("tax_rate") === null ? null : toRupeeNumber(formData.get("tax_rate"), "Tax rate", { max: 100 }),
      customization_enabled: toBoolean(formData.get("customization_enabled")),
      customization_schema: customizationSchema,
      service_addons: serviceAddons,
      delivery_estimate: optionalString(formData.get("delivery_estimate"), "Delivery", { max: 120 }),
      revision_policy: optionalString(formData.get("revision_policy"), "Revision policy", { max: 300 }),
      license_terms: optionalString(formData.get("license_terms"), "License", { max: 300 }),
      is_featured: toBoolean(formData.get("is_featured")),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort order", { min: -999, max: 9999 }),
      updated_at: new Date().toISOString(),
    };

    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    if (id) {
      const { error } = await sb.from("products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.updated", entity: "product", entityId: id, meta: { name } });
    } else {
      const { data, error } = await sb.from("products").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.created", entity: "product", entityId: data?.id, meta: { name } });
    }
  } catch (e) {
    adminFail(e, back);
  }
  revalidatePath("/", "layout");
  redirect("/admin/products?saved=1");
  return;
}

export async function deleteProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), "/admin/products");
  const { error } = await sb!.from("products").delete().eq("id", id);
  if (error) adminFail(new Error(error.message), "/admin/products");
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.deleted", entity: "product", entityId: id });
  ok("/admin/products", "deleted");
}

export async function duplicateProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), "/admin/products");
  const { data: src } = await sb!.from("products").select("*").eq("id", id).maybeSingle();
  if (!src) adminFail(new Error("Product not found."), "/admin/products");
  const { id: _drop1, created_at: _drop2, updated_at: _drop3, ...rest } = src as Record<string, unknown>;
  const { data, error } = await sb!
    .from("products")
    .insert({ ...rest, name: `${String(src.name)} (copy)`, slug: `${String(src.slug)}-copy-${Date.now().toString(36)}`, status: "draft", is_demo: false })
    .select("id")
    .single();
  if (error) adminFail(new Error(error.message), "/admin/products");
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.duplicated", entity: "product", entityId: data?.id });
  redirect(`/admin/products/${data!.id}?saved=1`);
}

export async function bulkProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = requireEnum(formData.get("bulk"), ["publish", "unpublish", "feature", "unfeature"] as const, "Action");
  if (ids.length === 0) redirect("/admin/products?error=Select%20rows");
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), "/admin/products");
  const patch =
    action === "publish" ? { status: "published" }
    : action === "unpublish" ? { status: "archived" }
    : action === "feature" ? { is_featured: true }
    : { is_featured: false };
  const { error } = await sb!.from("products").update(patch).in("id", ids.slice(0, 100));
  if (error) adminFail(new Error(error.message), "/admin/products");
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: `product.bulk_${action}`, entity: "product", meta: { count: ids.length } });
  ok("/admin/products");
}

/* ------------------------------ CATEGORIES ------------------------------- */
export async function upsertCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const name = requireString(formData.get("name"), "Name", { max: 120 });
    const slug = slugify(optionalString(formData.get("slug"), "slug") ?? name);
    const payload = {
      name,
      slug,
      kind: requireEnum(formData.get("kind"), KINDS, "Kind"),
      parent_id: optionalString(formData.get("parent_id"), "parent") || null,
      description: optionalString(formData.get("description"), "Description", { max: 500 }),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort", { min: -999, max: 9999 }),
      is_published: toBoolean(formData.get("is_published")),
      updated_at: new Date().toISOString(),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id
      ? await sb.from("categories").update(payload).eq("id", id)
      : await sb.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "category.updated" : "category.created", entity: "category", entityId: id ?? slug, meta: { name } });
  } catch (e) {
    adminFail(e, "/admin/categories");
  }
  ok("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), "/admin/categories");
  const { count } = await sb!.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if ((count ?? 0) > 0) adminFail(new Error(`Category has ${count} product(s). Reassign them first.`), "/admin/categories");
  const { error } = await sb!.from("categories").delete().eq("id", id);
  if (error) adminFail(new Error(error.message), "/admin/categories");
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "category.deleted", entity: "category", entityId: id });
  ok("/admin/categories", "deleted");
}

export async function reorderCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const dir = requireEnum(formData.get("dir"), ["up", "down"] as const, "Direction");
  const sb = safeServiceSupabase();
  if (!sb) redirect("/admin/categories?error=config");
  const { data: all } = await sb!.from("categories").select("id, sort_order").order("sort_order");
  const list = all ?? [];
  const idx = list.findIndex((c: any) => c.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= list.length) redirect("/admin/categories");
  const a = list[idx];
  const b = list[swapWith];
  await sb!.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
  await sb!.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
  await logAudit({ actorUserId: admin.id, action: "category.reordered", entity: "category", entityId: id });
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

/* -------------------------------- THEMES --------------------------------- */
export async function upsertThemeAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const name = requireString(formData.get("name"), "Name", { max: 120 });
    const slug = slugify(optionalString(formData.get("slug"), "slug") ?? name);
    const configRaw = optionalString(formData.get("config"), "Config", { max: 5000 });
    let config: unknown = {};
    if (configRaw) {
      try {
        config = JSON.parse(configRaw);
        if (typeof config !== "object" || Array.isArray(config)) throw new Error();
      } catch {
        throw new ValidationError('Config must be a JSON object like {"bg":"#FAF7F1","accent":"#B08D57"}.', "config");
      }
    }
    const priceRaw = formData.get("price");
    const payload = {
      name,
      slug,
      description: optionalString(formData.get("description"), "Description", { max: 500 }),
      category_id: optionalString(formData.get("category_id"), "category") || null,
      preview_image_path: optionalString(formData.get("preview_image_path"), "Preview", { max: 400 }) || null,
      demo_url: optionalString(formData.get("demo_url"), "Demo URL", { max: 400 }) || null,
      price: priceRaw === null || String(priceRaw).trim() === "" ? null : toRupeeNumber(priceRaw, "Price"),
      tags: parseStringArray(String(formData.get("tags") ?? "").split(","), { max: 20 }),
      config,
      is_published: toBoolean(formData.get("is_published")),
      is_featured: toBoolean(formData.get("is_featured")),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort", { min: -999, max: 9999 }),
      updated_at: new Date().toISOString(),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id ? await sb.from("themes").update(payload).eq("id", id) : await sb.from("themes").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "theme.updated" : "theme.created", entity: "theme", entityId: id ?? slug, meta: { name } });
  } catch (e) {
    adminFail(e, "/admin/themes");
  }
  ok("/admin/themes");
}

export async function deleteThemeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), "/admin/themes");
  const { error } = await sb!.from("themes").delete().eq("id", id);
  if (error) adminFail(new Error(error.message), "/admin/themes");
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "theme.deleted", entity: "theme", entityId: id });
  ok("/admin/themes", "deleted");
}

/* --------------------------- QUOTES & CONTENT ---------------------------- */
export async function upsertQuoteAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const payload = {
      text: requireString(formData.get("text"), "Quote", { max: 800 }),
      text_ta: optionalString(formData.get("text_ta"), "Tamil text", { max: 800 }),
      author: optionalString(formData.get("author"), "Author", { max: 120 }),
      category: requireString(formData.get("category"), "Category", { max: 40 }),
      is_published: toBoolean(formData.get("is_published")),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort", { min: -999, max: 9999 }),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id ? await sb.from("quotes").update(payload).eq("id", id) : await sb.from("quotes").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "quote.updated" : "quote.created", entity: "quote", entityId: id });
  } catch (e) {
    adminFail(e, "/admin/content?tab=quotes");
  }
  ok("/admin/content?tab=quotes");
}

export async function deleteQuoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const sb = safeServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (sb) await sb.from("quotes").delete().eq("id", id);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "quote.deleted", entity: "quote", entityId: id });
  ok("/admin/content?tab=quotes", "deleted");
}

export async function upsertFaqAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const payload = {
      question: requireString(formData.get("question"), "Question", { max: 300 }),
      answer: requireString(formData.get("answer"), "Answer", { max: 3000 }),
      category: optionalString(formData.get("category"), "Category", { max: 40 }),
      is_published: toBoolean(formData.get("is_published")),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort", { min: -999, max: 9999 }),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id ? await sb.from("faqs").update(payload).eq("id", id) : await sb.from("faqs").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "faq.updated" : "faq.created", entity: "faq", entityId: id });
  } catch (e) {
    adminFail(e, "/admin/content?tab=faqs");
  }
  ok("/admin/content?tab=faqs");
}

export async function deleteFaqAction(formData: FormData) {
  const admin = await requireAdmin();
  const sb = safeServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (sb) await sb.from("faqs").delete().eq("id", id);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "faq.deleted", entity: "faq", entityId: id });
  ok("/admin/content?tab=faqs", "deleted");
}

export async function upsertPageAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const slug = slugify(requireString(formData.get("slug"), "Slug", { max: 120 }));
    const payload = {
      slug,
      title: requireString(formData.get("title"), "Title", { max: 200 }),
      body_md: requireString(formData.get("body_md"), "Content", { max: 30000 }),
      is_published: toBoolean(formData.get("is_published")),
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id
      ? await sb.from("content_pages").update(payload).eq("id", id)
      : await sb.from("content_pages").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "page.updated" : "page.created", entity: "content_page", entityId: slug });
  } catch (e) {
    adminFail(e, "/admin/content?tab=pages");
  }
  ok("/admin/content?tab=pages");
}

/* ------------------------------ COUPONS ---------------------------------- */
export async function upsertCouponAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const code = requireString(formData.get("code"), "Code", { max: 40 }).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new ValidationError("Code must be 3–40 letters/numbers.", "code");
    const kind = requireEnum(formData.get("kind"), ["percent", "fixed"] as const, "Kind");
    const value = toRupeeNumber(formData.get("value"), "Value", { min: 0.01, max: 1_000_000 });
    if (kind === "percent" && value > 100) throw new ValidationError("Percent cannot exceed 100.", "value");
    const maxDisc = formData.get("max_discount");
    const usageLimit = formData.get("usage_limit");
    const payload = {
      code,
      kind,
      value,
      min_purchase: toRupeeNumber(formData.get("min_purchase") ?? "0", "Minimum purchase"),
      max_discount: maxDisc === null || String(maxDisc).trim() === "" ? null : toRupeeNumber(maxDisc, "Max discount"),
      starts_at: optionalString(formData.get("starts_at"), "Starts", { max: 40 }) || null,
      expires_at: optionalString(formData.get("expires_at"), "Expires", { max: 40 }) || null,
      usage_limit: usageLimit === null || String(usageLimit).trim() === "" ? null : toInt(usageLimit, "Usage limit", { min: 1, max: 1_000_000 }),
      per_user_limit: toInt(formData.get("per_user_limit") ?? "1", "Per-user limit", { min: 1, max: 100 }),
      first_order_only: toBoolean(formData.get("first_order_only")),
      applies_to: requireEnum(formData.get("applies_to"), ["all", "product", "category"] as const, "Applies to"),
      is_active: toBoolean(formData.get("is_active")),
      description: optionalString(formData.get("description"), "Description", { max: 300 }),
      updated_at: new Date().toISOString(),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id ? await sb.from("coupons").update(payload).eq("id", id) : await sb.from("coupons").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "coupon.updated" : "coupon.created", entity: "coupon", entityId: code });
  } catch (e) {
    adminFail(e, "/admin/coupons");
  }
  ok("/admin/coupons");
}

export async function deleteCouponAction(formData: FormData) {
  const admin = await requireAdmin();
  const sb = safeServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (sb) await sb.from("coupons").delete().eq("id", id);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "coupon.deleted", entity: "coupon", entityId: id });
  ok("/admin/coupons", "deleted");
}

/* ------------------------------ BANNERS ---------------------------------- */
export async function upsertBannerAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const id = optionalString(formData.get("id"), "id");
    const payload = {
      title: requireString(formData.get("title"), "Title", { max: 200 }),
      subtitle: optionalString(formData.get("subtitle"), "Subtitle", { max: 300 }),
      cta_label: optionalString(formData.get("cta_label"), "CTA label", { max: 60 }),
      cta_url: optionalString(formData.get("cta_url"), "CTA URL", { max: 300 }),
      coupon_code: optionalString(formData.get("coupon_code"), "Coupon", { max: 40 }),
      placement: requireEnum(formData.get("placement"), ["announcement", "hero_strip", "banner"] as const, "Placement"),
      starts_at: optionalString(formData.get("starts_at"), "Starts", { max: 40 }) || null,
      expires_at: optionalString(formData.get("expires_at"), "Expires", { max: 40 }) || null,
      is_active: toBoolean(formData.get("is_active")),
      sort_order: toInt(formData.get("sort_order") ?? "0", "Sort", { min: -999, max: 9999 }),
    };
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { error } = id ? await sb.from("offer_banners").update(payload).eq("id", id) : await sb.from("offer_banners").insert(payload);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: id ? "banner.updated" : "banner.created", entity: "offer_banner", entityId: id ?? payload.title });
  } catch (e) {
    adminFail(e, "/admin/offers");
  }
  ok("/admin/offers");
}

export async function deleteBannerAction(formData: FormData) {
  const admin = await requireAdmin();
  const sb = safeServiceSupabase();
  const id = String(formData.get("id") ?? "");
  if (sb) await sb.from("offer_banners").delete().eq("id", id);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "banner.deleted", entity: "offer_banner", entityId: id });
  ok("/admin/offers", "deleted");
}

/* --------------------------- Product media ------------------------------- */
import { toInt as _toIntM } from "@/lib/validation";

export async function addProductMediaAction(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("product_id") ?? "");
  const path = requireString(formData.get("path"), "Path", { max: 400 });
  const kind = requireEnum(formData.get("kind"), ["image", "video"] as const, "Kind");
  const alt = optionalString(formData.get("alt"), "Alt text", { max: 200 });
  const sort = _toIntM(formData.get("sort_order") ?? "0", "Sort", { min: -99, max: 999 });
  const sb = safeServiceSupabase();
  if (!sb) redirect(`/admin/products/${productId}?error=config`);
  const { error } = await sb.from("product_media").insert({ product_id: productId, path, kind, alt, sort_order: sort });
  if (error) redirect(`/admin/products/${productId}?error=${encodeURIComponent(error.message)}`);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.media_added", entity: "product", entityId: productId, meta: { path, kind } });
  revalidatePath("/", "layout");
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteProductMediaAction(formData: FormData) {
  const admin = await requireAdmin();
  const productId = String(formData.get("product_id") ?? "");
  const mediaId = String(formData.get("media_id") ?? "");
  const sb = safeServiceSupabase();
  if (sb) await sb.from("product_media").delete().eq("id", mediaId);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "product.media_removed", entity: "product", entityId: productId, meta: { mediaId } });
  revalidatePath("/", "layout");
  redirect(`/admin/products/${productId}?saved=1`);
}
