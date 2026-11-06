/** Admin customer views, wishlist, support, newsletter. */
import { safeServiceSupabase } from "@/lib/supabase/admin";

export interface CustomerListRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
  orderCount: number;
  totalSpent: number;
}

export async function listCustomersAdmin(opts?: { q?: string; page?: number; pageSize?: number }) {
  const empty = { items: [] as CustomerListRow[], total: 0 };
  const sb = safeServiceSupabase();
  if (!sb) return empty;
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = opts?.pageSize ?? 20;
  const { data: roleRows } = await sb.from("user_roles").select("user_id, role");
  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const cur = rolesByUser.get(r.user_id as string) ?? [];
    cur.push(r.role as string);
    rolesByUser.set(r.user_id as string, cur);
  }
  let q = sb
    .from("profiles")
    .select("id, full_name, email, phone, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (opts?.q) {
    const safe = opts.q.replace(/[%_\\]/g, "").slice(0, 80);
    q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  const ids = (data ?? []).map((p: any) => p.id as string);
  const ordersByUser = new Map<string, { count: number; spent: number }>();
  if (ids.length) {
    const { data: orders } = await sb
      .from("orders")
      .select("user_id, grand_total, payment_status")
      .in("user_id", ids);
    for (const o of (orders ?? []) as any[]) {
      if (!o.user_id) continue;
      const cur = ordersByUser.get(o.user_id) ?? { count: 0, spent: 0 };
      cur.count += 1;
      if (o.payment_status === "paid") cur.spent += Number(o.grand_total);
      ordersByUser.set(o.user_id, cur);
    }
  }
  return {
    items: (data ?? []).map((p: any) => ({
      id: p.id as string,
      full_name: (p.full_name as string | null) ?? null,
      email: (p.email as string | null) ?? null,
      phone: (p.phone as string | null) ?? null,
      created_at: p.created_at as string,
      roles: rolesByUser.get(p.id as string) ?? ["customer"],
      orderCount: ordersByUser.get(p.id as string)?.count ?? 0,
      totalSpent: ordersByUser.get(p.id as string)?.spent ?? 0,
    })),
    total: count ?? 0,
  };
}

export interface CustomerDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  roles: string[];
}

export async function getCustomerAdmin(userId: string): Promise<CustomerDetail | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email, phone, marketing_opt_in, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return {
    id: profile.id as string,
    full_name: (profile.full_name as string | null) ?? null,
    email: (profile.email as string | null) ?? null,
    phone: (profile.phone as string | null) ?? null,
    marketing_opt_in: Boolean(profile.marketing_opt_in),
    created_at: profile.created_at as string,
    roles: ((roleRows ?? []) as any[]).map((r) => r.role as string),
  };
}

/* ------------------------------- Wishlist -------------------------------- */
export async function listWishlistProducts(userId: string) {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("wishlists")
    .select("created_at, product:products(*, category:categories(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { data: existing } = await sb
    .from("wishlists")
    .select("product_id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) {
    await sb.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
    return false;
  }
  await sb.from("wishlists").insert({ user_id: userId, product_id: productId });
  return true;
}

/* ------------------------------- Support --------------------------------- */
export async function createTicket(userId: string, subject: string, body: string) {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  const { data: ticket, error } = await sb
    .from("support_tickets")
    .insert({ user_id: userId, subject })
    .select("id")
    .single();
  if (error || !ticket) throw new Error(error?.message ?? "Could not create ticket.");
  await sb.from("support_messages").insert({ ticket_id: ticket.id, author_user_id: userId, author_role: "customer", body });
  return ticket.id as string;
}

export interface TicketRow {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
}

export async function listTickets(opts: { userId?: string }) {
  const sb = safeServiceSupabase();
  if (!sb) return { items: [] as TicketRow[] };
  let q = sb.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(200);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data } = await q;
  const rows = (data ?? []) as Omit<TicketRow, "user_email">[];
  const userIds = [...new Set(rows.map((t) => t.user_id))];
  const emailByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await sb.from("profiles").select("id, email").in("id", userIds);
    for (const p of profiles ?? []) emailByUser.set(p.id as string, (p.email as string) ?? "");
  }
  return {
    items: rows.map((t) => ({ ...t, user_email: emailByUser.get(t.user_id) ?? null })),
  };
}

export interface TicketDetail {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTicketWithMessages(ticketId: string) {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data: ticket } = await sb.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;
  const { data: messages } = await sb
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return { ticket: ticket as TicketDetail, messages: messages ?? [] };
}

/* ------------------------------- Newsletter ------------------------------ */
export async function subscribeNewsletter(email: string, consent: boolean) {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Database is not configured.");
  if (!consent) throw new Error("Please allow us to send you updates to subscribe.");
  const { error } = await sb.from("newsletter_subscribers").upsert({ email, consent }, { onConflict: "email" });
  if (error) throw new Error(error.message);
}
