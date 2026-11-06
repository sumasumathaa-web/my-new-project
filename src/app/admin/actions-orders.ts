"use server";

/** Admin order / support / customer-website mutations. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { getOrderById, markOrderPaid, updateOrderStatus } from "@/lib/db/orders";
import { sendOrderStatusEmail } from "@/lib/db/notifications";
import { logAudit } from "@/lib/audit";
import { fromPaise, toPaise } from "@/lib/money";
import { optionalString, requireEnum, requireString, toRupeeNumber, ValidationError } from "@/lib/validation";
import type { OrderStatus } from "@/lib/types";

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_progress",
  "awaiting_info",
  "ready_for_review",
  "delivered",
  "cancelled",
  "refunded",
];

function adminFail(e: unknown, path: string): never {
  redirect(`${path}?error=${encodeURIComponent(e instanceof Error ? e.message : "Operation failed")}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = `/admin/orders/${id}`;
  try {
    const to = requireEnum(formData.get("status"), ALL_STATUSES, "Status");
    const note = optionalString(formData.get("note"), "Note", { max: 1000 });
    const error = await updateOrderStatus({ orderId: id, to, changedBy: admin.id, note: note ?? undefined });
    if (error) throw new ValidationError(error);
    if (["in_progress", "awaiting_info", "ready_for_review", "delivered"].includes(to)) {
      await sendOrderStatusEmail(id, to.replace(/_/g, " "));
    }
  } catch (e) {
    adminFail(e, back);
  }
  revalidatePath("/admin/orders");
  redirect(`${back}?saved=1`);
}

export async function updateOrderNotesAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = `/admin/orders/${id}`;
  const internal = optionalString(formData.get("notes_internal"), "Internal notes", { max: 4000 });
  const customer = optionalString(formData.get("notes_customer"), "Customer note", { max: 4000 });
  const sb = safeServiceSupabase();
  if (!sb) adminFail(new Error("Database is not configured."), back);
  const { error } = await sb!.from("orders").update({ notes_internal: internal, notes_customer: customer }).eq("id", id);
  if (error) adminFail(new Error(error.message), back);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "order.notes_updated", entity: "order", entityId: id });
  revalidatePath("/admin/orders");
  redirect(`${back}?saved=1`);
}

/** Record a manual/offline payment (UPI/bank transfer reference) — admin attestation. */
export async function recordManualPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = `/admin/orders/${id}`;
  try {
    const order = await getOrderById(id);
    if (!order) throw new ValidationError("Order not found.");
    if (order.payment_status === "paid") throw new ValidationError("Order is already marked paid.");
    const reference = requireString(formData.get("reference"), "Payment reference", { max: 120 });
    const method = optionalString(formData.get("method"), "Method", { max: 60 }) ?? "offline";
    const amountRaw = formData.get("amount");
    const amountPaise =
      amountRaw === null || String(amountRaw).trim() === "" ? toPaise(order.grand_total) : toPaise(toRupeeNumber(amountRaw, "Amount"));
    if (amountPaise !== toPaise(order.grand_total)) {
      throw new ValidationError(`Amount must equal the order total ₹${Number(order.grand_total)}.`, "amount");
    }
    await markOrderPaid({
      orderId: order.id,
      provider: "manual",
      providerPaymentId: `manual-${reference.replace(/\s+/g, "")}`.slice(0, 90),
      amountPaise,
      method,
      signatureVerified: false,
      raw: { recordedBy: admin.email, reference },
      notes: `Payment confirmed manually (${method}, ref ${reference}) by the team.`,
    });
    await logAudit({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "order.manual_payment_recorded",
      entity: "order",
      entityId: id,
      meta: { reference, amount: fromPaise(amountPaise) },
    });
    await sendOrderStatusEmail(id, "paid");
  } catch (e) {
    adminFail(e, back);
  }
  revalidatePath("/admin/orders");
  redirect(`${back}?saved=1`);
}

export async function cancelOrderAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = `/admin/orders/${id}`;
  const order = await getOrderById(id);
  if (!order) adminFail(new Error("Order not found."), "/admin/orders");
  if (order!.payment_status === "paid") {
    adminFail(new Error("Paid orders must be refunded, not cancelled."), back);
  }
  const sb = safeServiceSupabase();
  if (sb) {
    // Free the coupon slot when an unpaid order is cancelled.
    await sb.from("coupon_usages").delete().eq("order_id", id);
  }
  const error = await updateOrderStatus({ orderId: id, to: "cancelled", changedBy: admin.id, note: "Cancelled from admin" });
  if (error) adminFail(new Error(error), back);
  revalidatePath("/admin/orders");
  redirect(`${back}?saved=1`);
}

export async function recordRefundAction(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("payment_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const back = `/admin/orders/${orderId}`;
  try {
    const amount = toRupeeNumber(formData.get("amount"), "Refund amount", { min: 0.01 });
    const reason = requireString(formData.get("reason"), "Reason", { max: 300 });
    const sb = safeServiceSupabase();
    if (!sb) throw new ValidationError("Database is not configured.");
    const { data: payment } = await sb.from("payments").select("*").eq("id", paymentId).maybeSingle();
    if (!payment) throw new ValidationError("Payment not found.");
    if (Number(amount) > Number(payment.amount)) throw new ValidationError("Refund cannot exceed the payment amount.");
    await sb.from("refunds").insert({
      payment_id: paymentId,
      amount,
      reason,
      created_by: admin.id,
      status: "recorded",
    });
    const full = Number(amount) >= Number(payment.amount);
    await sb.from("payments").update({ status: full ? "refunded" : "partially_refunded" }).eq("id", paymentId);
    await sb
      .from("orders")
      .update(full ? { payment_status: "refunded", status: "refunded" } : { payment_status: "partially_refunded" })
      .eq("id", orderId);
    await logAudit({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "refund.recorded",
      entity: "payment",
      entityId: paymentId,
      meta: { amount, reason },
    });
  } catch (e) {
    adminFail(e, back);
  }
  revalidatePath("/admin/orders");
  redirect(`${back}?saved=1`);
}

/* ---------------------------- Customer websites --------------------------- */
export async function adminSetCustomizationStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = requireEnum(formData.get("status"), ["draft", "published", "archived"] as const, "Status");
  const sb = safeServiceSupabase();
  if (!sb) redirect("/admin/customer-websites?error=config");
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { error } = await sb!.from("customizations").update(patch).eq("id", id);
  if (error) redirect(`/admin/customer-websites?error=${encodeURIComponent(error.message)}`);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: `customization.admin_${status}`, entity: "customization", entityId: id });
  revalidatePath("/admin/customer-websites");
  redirect("/admin/customer-websites?saved=1");
}

/* -------------------------------- Support --------------------------------- */
export async function adminReplyTicketAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = requireString(formData.get("message"), "Reply", { max: 4000 });
  const sb = safeServiceSupabase();
  if (!sb) redirect(`/admin/support/${id}?error=config`);
  await sb!.from("support_messages").insert({ ticket_id: id, author_user_id: admin.id, author_role: "admin", body });
  await sb!.from("support_tickets").update({ status: "in_progress" }).eq("id", id);
  await logAudit({ actorUserId: admin.id, actorEmail: admin.email, action: "ticket.admin_reply", entity: "ticket", entityId: id });
  revalidatePath(`/admin/support/${id}`);
  redirect(`/admin/support/${id}?sent=1`);
}

export async function adminSetTicketStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = requireEnum(formData.get("status"), ["open", "in_progress", "resolved", "closed"] as const, "Status");
  const sb = safeServiceSupabase();
  if (!sb) redirect("/admin/support?error=config");
  await sb!.from("support_tickets").update({ status }).eq("id", id);
  await logAudit({ actorUserId: admin.id, action: "ticket.status_changed", entity: "ticket", entityId: id, meta: { status } });
  revalidatePath("/admin/support");
  redirect(`/admin/support/${id}?saved=1`);
}
