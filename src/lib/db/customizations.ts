/**
 * Customer invitation customizations — each customer's configuration is stored
 * as a separate row; publishing one customer's invitation can never touch
 * another's (row-level user_id ownership + unique public slug).
 */
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/validation";
import type { Customization } from "@/lib/types";
import crypto from "crypto";

export async function listUserCustomizations(userId: string): Promise<Customization[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("customizations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Customization[];
}

export async function getUserCustomization(id: string, userId: string): Promise<Customization | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("customizations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return (data as Customization | null) ?? null;
}

export async function getPublishedCustomization(slug: string): Promise<Customization | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("customizations")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as Customization | null) ?? null;
}

export async function listAllCustomizationsAdmin(): Promise<Customization[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb.from("customizations").select("*").order("updated_at", { ascending: false }).limit(500);
  return (data ?? []) as Customization[];
}

function newSlug(title: string): string {
  const base = slugify(title) || "invitation";
  return `${base}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function createCustomization(params: {
  userId: string;
  productId: string | null;
  productName: string | null;
  title: string;
  config: Record<string, unknown>;
  orderId?: string | null;
}): Promise<Customization> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { data, error } = await sb
    .from("customizations")
    .insert({
      user_id: params.userId,
      product_id: params.productId,
      product_name: params.productName,
      title: params.title,
      slug: newSlug(params.title),
      config: params.config,
      status: "draft",
      version: 1,
      order_id: params.orderId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save customization.");
  return data as Customization;
}

/** Save a new version: previous state is archived to website_revisions first. */
export async function updateCustomization(params: {
  id: string;
  userId: string;
  title?: string;
  config: Record<string, unknown>;
}): Promise<Customization> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const current = await getUserCustomization(params.id, params.userId);
  if (!current) throw new Error("Customization not found.");

  await sb.from("website_revisions").insert({
    customization_id: current.id,
    version: current.version,
    config: current.config,
    saved_by: params.userId,
  });

  const { data, error } = await sb
    .from("customizations")
    .update({
      config: params.config,
      title: params.title ?? current.title,
      version: current.version + 1,
    })
    .eq("id", current.id)
    .eq("user_id", params.userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update customization.");
  return data as Customization;
}

export async function setCustomizationStatus(params: {
  id: string;
  userId: string;
  status: "draft" | "published" | "archived";
}): Promise<Customization> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === "published") patch.published_at = new Date().toISOString();
  const { data, error } = await sb
    .from("customizations")
    .update(patch)
    .eq("id", params.id)
    .eq("user_id", params.userId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update status.");
  return data as Customization;
}

/** Restores a saved revision as the current config (creates a new version). */
export async function restoreRevision(params: {
  id: string;
  userId: string;
  revisionVersion: number;
}): Promise<Customization> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { data: rev } = await sb
    .from("website_revisions")
    .select("*")
    .eq("customization_id", params.id)
    .eq("version", params.revisionVersion)
    .maybeSingle();
  if (!rev) throw new Error("Revision not found.");
  return updateCustomization({
    id: params.id,
    userId: params.userId,
    config: rev.config as Record<string, unknown>,
  });
}

export async function listRevisions(customizationId: string, userId: string) {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("website_revisions")
    .select("id, version, created_at, customization:customizations!inner(user_id)")
    .eq("customization_id", customizationId)
    .order("version", { ascending: false })
    .limit(50);
  return (data ?? []).filter(
    (r: { customization?: { user_id?: string } | { user_id?: string }[] }) => {
      const c = Array.isArray(r.customization) ? r.customization[0] : r.customization;
      return c?.user_id === userId;
    },
  );
}
