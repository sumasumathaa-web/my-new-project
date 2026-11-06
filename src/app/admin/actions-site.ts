"use server";

/** Admin site/branding/homepage/roles/media mutations. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { saveSetting, getHomepage, DEFAULT_HOMEPAGE, SETTINGS_KEYS } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { removeObject } from "@/lib/db/storage";
import type { BrandingSettings, HomepageSettings, RegionalSettings, HomepageSection } from "@/lib/types";
import {
  isHexColor,
  isHttpUrl,
  optionalString,
  requireEnum,
  requireString,
  toBoolean,
  toRupeeNumber,
  ValidationError,
} from "@/lib/validation";

function adminFail(e: unknown, path: string): never {
  redirect(`${path}?error=${encodeURIComponent(e instanceof Error ? e.message : "Operation failed")}`);
}

const SECTION_IDS: HomepageSection["id"][] = [
  "hero",
  "featured_videos",
  "featured_websites",
  "digital_cards",
  "trending_themes",
  "new_arrivals",
  "best_sellers",
  "offers",
  "custom_services",
  "how_it_works",
  "faqs",
  "newsletter",
];

/* ------------------------------- Branding -------------------------------- */
export async function saveBrandingAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const businessName = requireString(formData.get("businessName"), "Business name", { max: 120 });
    const primaryColor = optionalString(formData.get("primaryColor"), "Primary colour", { max: 7 }) ?? "#B08D57";
    const accentColor = optionalString(formData.get("accentColor"), "Accent colour", { max: 7 }) ?? "#6E1E2C";
    if (primaryColor && !isHexColor(primaryColor)) throw new ValidationError("Primary colour must be like #B08D57.", "primaryColor");
    if (accentColor && !isHexColor(accentColor)) throw new ValidationError("Accent colour must be like #6E1E2C.", "accentColor");
    for (const key of ["instagram", "facebook", "youtube", "twitter"] as const) {
      const v = optionalString(formData.get(key), key, { max: 300 });
      if (v && !isHttpUrl(v)) throw new ValidationError(`${key} must be a full URL (https://…).`, key);
    }
    const payload: BrandingSettings = {
      businessName,
      tagline: optionalString(formData.get("tagline"), "Tagline", { max: 160 }) ?? "",
      logoPath: optionalString(formData.get("logoPath"), "Logo", { max: 400 }),
      faviconPath: optionalString(formData.get("faviconPath"), "Favicon", { max: 400 }),
      primaryColor,
      accentColor,
      phone: optionalString(formData.get("phone"), "Phone", { max: 30 }) ?? "",
      whatsapp: optionalString(formData.get("whatsapp"), "WhatsApp", { max: 20 })?.replace(/[^0-9+]/g, "") ?? "",
      email: optionalString(formData.get("email"), "Email", { max: 254 }) ?? "",
      address: optionalString(formData.get("address"), "Address", { max: 400 }) ?? "",
      instagram: optionalString(formData.get("instagram"), "Instagram", { max: 300 }) ?? "",
      facebook: optionalString(formData.get("facebook"), "Facebook", { max: 300 }) ?? "",
      youtube: optionalString(formData.get("youtube"), "YouTube", { max: 300 }) ?? "",
      twitter: optionalString(formData.get("twitter"), "Twitter", { max: 300 }) ?? "",
      currency: requireEnum(formData.get("currency"), ["INR"] as const, "Currency"),
      country: "IN",
      language: requireEnum(formData.get("language"), ["en", "ta"] as const, "Language"),
      websiteTitle: optionalString(formData.get("websiteTitle"), "Website title", { max: 160 }) ?? businessName,
      seoDescription: optionalString(formData.get("seoDescription"), "SEO description", { max: 300 }) ?? "",
      seoKeywords: optionalString(formData.get("seoKeywords"), "SEO keywords", { max: 300 }) ?? "",
    };
    await saveSetting(SETTINGS_KEYS.branding, payload, admin.id);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "settings.branding_saved", entity: "settings", entityId: "branding" });
  } catch (e) {
    adminFail(e, "/admin/settings");
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function saveRegionalAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const taxRate = toRupeeNumber(formData.get("taxRate") ?? "0", "Tax rate", { max: 100 });
    const payload: RegionalSettings = {
      currency: requireEnum(formData.get("currency"), ["INR"] as const, "Currency"),
      taxRate,
      country: "IN",
      language: requireEnum(formData.get("language"), ["en", "ta"] as const, "Language"),
    };
    await saveSetting(SETTINGS_KEYS.regional, payload, admin.id);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "settings.regional_saved", entity: "settings", entityId: "regional" });
  } catch (e) {
    adminFail(e, "/admin/settings");
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

/* ------------------------------- Homepage -------------------------------- */
export async function saveHomepageAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const current = await getHomepage();
    const sectionOrder = (current.sectionOrder?.length ? current.sectionOrder : DEFAULT_HOMEPAGE.sectionOrder).map((s) => ({
      id: s.id,
      enabled: toBoolean(formData.get(`sec_${s.id}`)),
    }));
    const payload: HomepageSettings = {
      heroTitle: requireString(formData.get("heroTitle"), "Hero title", { max: 160 }),
      heroSubtitle: optionalString(formData.get("heroSubtitle"), "Hero subtitle", { max: 400 }) ?? "",
      heroImagePath: optionalString(formData.get("heroImagePath"), "Hero image", { max: 400 }),
      heroVideoUrl: optionalString(formData.get("heroVideoUrl"), "Hero video", { max: 400 }) ?? "",
      heroCtaLabel: optionalString(formData.get("heroCtaLabel"), "CTA label", { max: 60 }) ?? "",
      heroCtaUrl: optionalString(formData.get("heroCtaUrl"), "CTA URL", { max: 300 }) ?? "",
      heroCta2Label: optionalString(formData.get("heroCta2Label"), "CTA 2 label", { max: 60 }) ?? "",
      heroCta2Url: optionalString(formData.get("heroCta2Url"), "CTA 2 URL", { max: 300 }) ?? "",
      announcement: optionalString(formData.get("announcement"), "Announcement", { max: 200 }) ?? "",
      announcementEnabled: toBoolean(formData.get("announcementEnabled")),
      announcementUrl: optionalString(formData.get("announcementUrl"), "Announcement URL", { max: 300 }) ?? "",
      footerText: optionalString(formData.get("footerText"), "Footer text", { max: 200 }) ?? "",
      sectionOrder,
    };
    await saveSetting(SETTINGS_KEYS.homepage, payload, admin.id);
    await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "homepage.saved", entity: "settings", entityId: "homepage" });
  } catch (e) {
    adminFail(e, "/admin/homepage");
  }
  revalidatePath("/", "layout");
  redirect("/admin/homepage?saved=1");
}

export async function moveSectionAction(formData: FormData) {
  const admin = await requireAdmin();
  // Button carries "sectionId:dir" as its submitted value
  const payload = requireString(formData.get("payload"), "Section move", { max: 80 });
  const [rawId, rawDir] = payload.split(":");
  const id = requireEnum(rawId, SECTION_IDS, "Section");
  const dir = requireEnum(rawDir, ["up", "down"] as const, "Direction");
  const current = await getHomepage();
  const order = [...current.sectionOrder];
  const idx = order.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx >= 0 && swap >= 0 && swap < order.length) {
    [order[idx], order[swap]] = [order[swap], order[idx]];
    await saveSetting(SETTINGS_KEYS.homepage, { ...current, sectionOrder: order }, admin.id);
  }
  revalidatePath("/", "layout");
  redirect("/admin/homepage#sections");
}

/* -------------------------------- Media ---------------------------------- */
export async function deleteMediaAction(formData: FormData) {
  const admin = await requireAdmin();
  const path = requireString(formData.get("path"), "Path", { max: 400 });
  const bucket = requireString(formData.get("bucket"), "Bucket", { max: 60 });
  if (!["public-media", "customer-uploads", "deliverables"].includes(bucket)) {
    redirect("/admin/media?error=bad_bucket");
  }
  await removeObject(bucket, path);
  const sb = safeServiceSupabase();
  if (sb) await sb.from("files").delete().eq("bucket", bucket).eq("path", path);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "media.deleted", entity: "file", entityId: `${bucket}/${path}` });
  redirect("/admin/media?deleted=1");
}

/* -------------------------------- Roles ---------------------------------- */
export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = requireString(formData.get("user_id"), "User", { max: 40 });
  const role = requireEnum(formData.get("role"), ["admin", "editor", "support", "customer"] as const, "Role");
  const mode = requireEnum(formData.get("mode"), ["grant", "revoke"] as const, "Mode");
  if (mode === "revoke" && role === "admin" && userId === admin.id) {
    redirect("/admin/roles?error=You%20cannot%20revoke%20your%20own%20admin%20role");
  }
  const sb = safeServiceSupabase();
  if (!sb) redirect("/admin/roles?error=config");
  if (mode === "grant") {
    await sb!.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  } else if (role === "customer") {
    await sb!.from("user_roles").delete().eq("user_id", userId).eq("role", "customer");
  } else {
    await sb!.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  }
  await logAudit({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: `role.${mode}`,
    entity: "user",
    entityId: userId,
    meta: { role },
  });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}
