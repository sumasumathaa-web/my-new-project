import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { uploadObject } from "@/lib/db/storage";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX = 250 * 1024 * 1024; // 250 MB deliverable cap (videos can be big)
const BUCKET = "deliverables";

/** Admin: upload a finished deliverable into the private bucket and attach it to an order item. */
export async function POST(request: Request) {
  const auth = await getApiAuth();
  if (!auth?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const sessionUser = auth.user;
  const admin = auth.user;
  const rlDel = rateLimit({ scope: "deliverable", key: sessionUser.id, limit: 20, windowMs: 60_000 });
  if (!rlDel.ok) return NextResponse.json({ error: "Too many uploads — slow down." }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  const itemId = String(form.get("order_item_id") ?? "");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Deliverable too large (250 MB max)." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return NextResponse.json({ error: "Invalid order item" }, { status: 400 });

  const sb = safeServiceSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data: item } = await sb
    .from("order_items")
    .select("id, order_id, order:orders(user_id, status, payment_status)")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  const order = (item as unknown as { order: { user_id: string | null; status: string; payment_status: string } }).order;
  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "Deliverables can only be attached to paid orders." }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const owner = order.user_id ?? "guest";
  const path = `${owner}/${item.order_id}/${Date.now()}.${ext}`;

  try {
    await uploadObject({ bucket: BUCKET, path, data: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }

  const { error } = await sb.from("order_items").update({ deliverable_path: path }).eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("files").insert({
    bucket: BUCKET,
    path,
    size_bytes: file.size,
    mime: file.type,
    uploaded_by: admin.id,
    kind: "deliverable",
  });
  await logAudit({ actorUserId: admin.id, action: "deliverable.uploaded", entity: "order_item", entityId: itemId, meta: { path } });

  return NextResponse.json({ ok: true, path });
}
