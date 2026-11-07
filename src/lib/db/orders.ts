/** Order + payment data access (server / service role). */
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { Json, OrderRow, OrderStatus, Payment, OrderItem } from "@/lib/types";
import { fromPaise } from "@/lib/money";
import type { Totals } from "@/lib/pricing";

export const PAID_STATUSES: OrderStatus[] = ["paid", "in_progress", "awaiting_info", "ready_for_review", "delivered"];

export interface NewOrderInput {
  userId: string | null;
  email: string;
  phone: string | null;
  customer: Record<string, unknown>;
  totals: Totals;
  couponCode: string | null;
}

/** Creates an order (pending_payment) + items from server-computed totals. */
export async function createPendingOrder(input: NewOrderInput): Promise<{ id: string; orderNumber: string }> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { data: order, error } = await sb
    .from("orders")
    .insert({
      user_id: input.userId,
      email: input.email,
      phone: input.phone,
      customer: input.customer,
      status: "pending_payment",
      payment_status: "pending",
      subtotal: fromPaise(input.totals.subtotalPaise),
      discount_total: fromPaise(input.totals.discountPaise),
      tax_total: fromPaise(input.totals.taxPaise),
      grand_total: fromPaise(input.totals.grandPaise),
      coupon_code: input.couponCode,
    })
    .select("id, order_number")
    .single();
  if (error || !order) throw new Error(error?.message ?? "Could not create order.");

  const items = input.totals.lines.map((l) => ({
    order_id: order.id,
    product_id: l.productId,
    product_name: l.name,
    kind: l.kind,
    unit_price: fromPaise(l.unitPaise),
    quantity: l.quantity,
    addons_total: fromPaise(l.addonsPaise * l.quantity),
    tax_rate: l.taxRate,
    total: fromPaise(l.lineSubtotalPaise),
    options: input.totals.lines.find((x) => x.productId === l.productId)?.customizationFeePaise
      ? { customized: true }
      : {},
  }));
  const { error: itemErr } = await sb.from("order_items").insert(items);
  if (itemErr) throw new Error(itemErr.message);
  return { id: order.id, orderNumber: order.order_number };
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("orders").select("*, items:order_items(*)").eq("id", id).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

export async function getOrderOwned(id: string, userId: string, isAdmin: boolean): Promise<OrderRow | null> {
  const order = await getOrderById(id);
  if (!order) return null;
  if (!isAdmin && order.user_id !== userId) return null;
  return order;
}

export async function listUserOrders(userId: string): Promise<OrderRow[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })
    .limit(100);
  return (data ?? []) as OrderRow[];
}

export interface OrderAdminFilter {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}

export async function listOrdersAdmin(filter: OrderAdminFilter): Promise<{ items: OrderRow[]; total: number }> {
  const empty = { items: [] as OrderRow[], total: 0 };
  const sb = safeServiceSupabase();
  if (!sb) return empty;
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = filter.pageSize ?? 20;
  let q = sb.from("orders").select("*, items:order_items(*)", { count: "exact" });
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.from) q = q.gte("placed_at", filter.from);
  if (filter.to) q = q.lte("placed_at", filter.to);
  if (filter.q) {
    const safe = filter.q.replace(/[%_\\]/g, "").slice(0, 80);
    q = q.or(`order_number.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  q = q.order("placed_at", { ascending: false });
  const { data, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  return { items: (data ?? []) as OrderRow[], total: count ?? 0 };
}

/** Updates order status with history + audit. Returns error message or null. */
export async function updateOrderStatus(params: {
  orderId: string;
  to: OrderStatus;
  changedBy: string;
  note?: string;
}): Promise<string | null> {
  const sb = safeServiceSupabase();
  if (!sb) return "Database is not configured.";
  const current = await getOrderById(params.orderId);
  if (!current) return "Order not found.";
  if (current.status === params.to) return null;
  // Guard: never downgrade a paid order back to pending_payment via this path.
  if (PAID_STATUSES.includes(current.status) && params.to === "pending_payment") {
    return "A paid order cannot be moved back to pending payment.";
  }
  const patch: Record<string, unknown> = { status: params.to };
  if (PAID_STATUSES.includes(params.to) && !current.paid_at) {
    patch.paid_at = new Date().toISOString();
    patch.payment_status = "paid";
  }
  if (params.to === "cancelled") patch.cancelled_at = new Date().toISOString();
  const { error } = await sb.from("orders").update(patch).eq("id", params.orderId);
  if (error) return error.message;
  await sb.from("order_status_history").insert({
    order_id: params.orderId,
    from_status: current.status,
    to_status: params.to,
    changed_by: params.changedBy,
    note: params.note ?? null,
  });
  await logAudit({
    actorUserId: params.changedBy,
    action: "order.status_changed",
    entity: "order",
    entityId: params.orderId,
    meta: { from: current.status, to: params.to },
  });
  return null;
}

/** Marks an order paid after VERIFIED payment (webhook or signature check). Idempotent. */
export async function markOrderPaid(params: {
  orderId: string;
  provider: "razorpay" | "manual";
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amountPaise: number;
  method?: string | null;
  signatureVerified: boolean;
  raw?: unknown;
  notes?: string;
}): Promise<{ alreadyPaid: boolean }> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const order = await getOrderById(params.orderId);
  if (!order) throw new Error("Order not found.");
  if (order.payment_status === "paid") return { alreadyPaid: true };

  // Idempotency: provider_payment_id unique — second capture attempt no-ops.
  if (params.providerPaymentId) {
    const { data: existing } = await sb
      .from("payments")
      .select("id, status")
      .eq("provider_payment_id", params.providerPaymentId)
      .maybeSingle();
    if (existing?.status === "captured") {
      if ((order.payment_status as string) !== "paid") {
        await sb
          .from("orders")
          .update({ payment_status: "paid", status: "paid", paid_at: new Date().toISOString() })
          .eq("id", order.id);
      }
      return { alreadyPaid: true };
    }
  }

  await sb.from("payments").insert({
    order_id: order.id,
    provider: params.provider,
    provider_order_id: params.providerOrderId ?? null,
    provider_payment_id: params.providerPaymentId ?? null,
    amount: fromPaise(params.amountPaise),
    currency: "INR",
    status: "captured",
    method: params.method ?? null,
    signature_verified: params.signatureVerified,
    raw: params.raw ?? {},
  });

  const { error } = await sb
    .from("orders")
    .update({
      payment_status: "paid",
      status: "paid",
      paid_at: new Date().toISOString(),
      notes_customer: params.notes ?? order.notes_customer,
    })
    .eq("id", order.id);
  if (error) throw new Error(error.message);
  await sb.from("order_status_history").insert({
    order_id: order.id,
    from_status: order.status,
    to_status: "paid",
    changed_by: null,
    note: `Payment captured via ${params.provider}${params.signatureVerified ? " (signature verified)" : ""}`,
  });
  await logAudit({
    action: "payment.captured",
    entity: "order",
    entityId: order.id,
    meta: {
      provider: params.provider,
      provider_payment_id: params.providerPaymentId ?? null,
      verified: params.signatureVerified,
    } as Json,
  });
  return { alreadyPaid: false };
}

export async function listPaymentsForOrder(orderId: string): Promise<Payment[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  return (data ?? []) as Payment[];
}

export async function listStatusHistory(orderId: string) {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Real dashboard statistics (no hardcoded numbers). */
export async function getOrderStats() {
  const sb = safeServiceSupabase();
  const zero = {
    totalOrders: 0,
    pending: 0,
    inProgress: 0,
    awaitingInfo: 0,
    completed: 0,
    cancelled: 0,
    revenuePaise: 0,
    pendingPayments: 0,
    totalProducts: 0,
    totalCustomers: 0,
  };
  if (!sb) return zero;
  const [orders, products, customers] = await Promise.all([
    sb.from("orders").select("status, payment_status, grand_total"),
    sb.from("products").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const stats = { ...zero, totalProducts: products.count ?? 0, totalCustomers: customers.count ?? 0 };
  for (const o of orders.data ?? []) {
    stats.totalOrders += 1;
    if (o.status === "pending_payment") stats.pending += 1;
    if (o.status === "in_progress" || o.status === "awaiting_info" || o.status === "ready_for_review") stats.inProgress += 1;
    if (o.status === "awaiting_info") stats.awaitingInfo += 1;
    if (o.status === "delivered") stats.completed += 1;
    if (o.status === "cancelled") stats.cancelled += 1;
    if (o.payment_status === "paid") stats.revenuePaise += Math.round(Number(o.grand_total) * 100);
    else if (o.status !== "cancelled" && o.status !== "refunded") stats.pendingPayments += 1;
  }
  return stats;
}
