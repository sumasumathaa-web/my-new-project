"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { isPhone, optionalString, sanitizeText, ValidationError } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { createTicket } from "@/lib/db/customers";

export async function updateProfileAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const sb = safeServiceSupabase();
  if (!sb) redirect("/account?error=config");
  try {
    const fullName = sanitizeText(optionalString(formData.get("full_name"), "Name", { max: 120}) ?? "");
    const phoneRaw = optionalString(formData.get("phone"), "Phone", { max: 20 });
    if (phoneRaw && !isPhone(phoneRaw)) throw new ValidationError("Enter a valid phone number.", "phone");
    const marketing = formData.get("marketing_opt_in") === "on";
    const { error } = await sb
      .from("profiles")
      .update({ full_name: fullName, phone: phoneRaw, marketing_opt_in: marketing })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: user.id, actorEmail: user.email, action: "profile.updated", entity: "profile", entityId: user.id });
  } catch (e) {
    redirect(`/account?error=${encodeURIComponent(e instanceof Error ? e.message : "Update failed")}`);
  }
  revalidatePath("/account");
  redirect("/account?saved=1");
}

export async function createTicketAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/support");
  try {
    const subject = sanitizeText(optionalString(formData.get("subject"), "Subject", { max: 160 }) ?? "");
    const body = sanitizeText(optionalString(formData.get("message"), "Message", { max: 4000 }) ?? "");
    if (!subject || !body) throw new ValidationError("Subject and message are required.");
    await createTicket(user.id, subject, body);
  } catch {
    redirect("/account/support?error=create");
  }
  revalidatePath("/account/support");
  redirect("/account/support?created=1");
}

export async function createDraftCustomizationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account/customizations")}`);
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) redirect("/account/customizations/new?error=product");
  const sb = safeServiceSupabase();
  if (!sb) redirect("/account/customizations/new?error=config");
  const { data: product } = await sb.from("products").select("id, name, slug").eq("id", productId).maybeSingle();
  if (!product) redirect("/account/customizations/new?error=product");
  // Reuse an existing draft for this product when present.
  const { data: existing } = await sb
    .from("customizations")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`/account/customizations/${existing.id}`);
  const { data, error } = await sb
    .from("customizations")
    .insert({
      user_id: user.id,
      product_id: product.id,
      product_name: product.name,
      title: product.name,
      slug: `${product.slug}-${crypto.randomUUID().slice(0, 8)}`,
      config: {},
    })
    .select("id")
    .single();
  if (error || !data) redirect("/account/customizations/new?error=create");
  await logAudit({ actorUserId: user.id, action: "customization.created", entity: "customization", entityId: data.id });
  redirect(`/account/customizations/${data.id}`);
}

export async function replyTicketAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/support");
  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = sanitizeText(String(formData.get("message") ?? ""));
  if (!ticketId || !body) redirect(`/account/support/${ticketId}?error=empty`);
  const sb = safeServiceSupabase();
  if (!sb) redirect(`/account/support/${ticketId}?error=config`);
  // ownership enforced here (defense in depth with RLS)
  const { data: ticket } = await sb.from("support_tickets").select("user_id").eq("id", ticketId).maybeSingle();
  if (!ticket || ticket.user_id !== user.id) redirect("/account/support?error=notfound");
  await sb.from("support_messages").insert({
    ticket_id: ticketId,
    author_user_id: user.id,
    author_role: "customer",
    body: body.slice(0, 4000),
  });
  revalidatePath(`/account/support/${ticketId}`);
  redirect(`/account/support/${ticketId}?sent=1`);
}
