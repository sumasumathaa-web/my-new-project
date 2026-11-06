/** Server-side cart: a draft order + its order_items. Never trusts client prices. */

import { safeServiceSupabase } from "@/lib/supabase/admin";
import type { Json, OrderItem } from "@/lib/types";

const ORDER_NO_PREFIX = "GF";

function orderNumber(): string {
  const now = new Date();
  return `${ORDER_NO_PREFIX}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function findDraftOrder(userId: string): Promise<string | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "cart")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

/** Creates a draft order with no customer details yet (they're gathered at checkout). */
export async function ensureDraftOrder(userId: string): Promise<{ orderId: string }> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const existing = await findDraftOrder(userId);
  if (existing) return { orderId: existing };
  const { data, error } = await sb
    .from("orders")
    .insert({
      order_number: orderNumber(),
      user_id: userId,
      status: "cart",
      payment_status: "pending",
      email: "",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create a cart.");
  return { orderId: data.id as string };
}

export async function listCartItems(orderId: string): Promise<OrderItem[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  return (data ?? []) as OrderItem[];
}

export async function upsertCartItem(input: {
  orderId: string;
  productId: string;
  productName: string;
  kind: string;
  unitPrice: number; // rupees, server-authoritative
  quantity: number;
}): Promise<void> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const unit = Math.max(0, Number(input.unitPrice));
  const qty = Math.min(10, Math.max(1, Math.floor(input.quantity)));
  const total = unit * qty;
  const { data: existing } = await sb
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", input.orderId)
    .eq("product_id", input.productId)
    .maybeSingle();
  if (existing) {
    const { error } = await sb
      .from("order_items")
      .update({
        quantity: qty,
        unit_price: unit,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await sb.from("order_items").insert({
    order_id: input.orderId,
    product_id: input.productId,
    product_name: input.productName,
    kind: input.kind,
    unit_price: unit,
    quantity: qty,
    addons_total: 0,
    tax_rate: 0,
    total,
    options: {} as Json,
  });
  if (error) throw new Error(error.message);
}

export async function removeCartItem(orderId: string, itemId: string): Promise<void> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { error } = await sb.from("order_items").delete().eq("order_id", orderId).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function countCartItems(orderId: string): Promise<number> {
  const sb = safeServiceSupabase();
  if (!sb) return 0;
  const { data } = await sb.from("order_items").select("id").eq("order_id", orderId);
  return data?.length ?? 0;
}
