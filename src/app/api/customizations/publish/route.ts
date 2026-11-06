import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { getUserCustomization, setCustomizationStatus } from "@/lib/db/customizations";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Publishing requires a PAID order containing the template product.
 * (Admins may publish on behalf of customers from the dashboard.)
 */
export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const existing = await getUserCustomization(String(body.id), auth.user.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const sb = safeServiceSupabase();
  if (!sb) return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
  if (existing.product_id && !auth.isAdmin) {
    const { data: purchased } = await sb
      .from("order_items")
      .select("id, orders!inner(user_id, payment_status)")
      .eq("product_id", existing.product_id)
      .eq("orders.user_id", auth.user.id)
      .eq("orders.payment_status", "paid")
      .limit(1);
    if (!purchased || purchased.length === 0) {
      return NextResponse.json(
        { error: "A paid order containing this template is required before publishing." },
        { status: 403 },
      );
    }
  }

  const updated = await setCustomizationStatus({ id: existing.id, userId: auth.user.id, status: "published" });
  await logAudit({
    actorUserId: auth.user.id,
    action: "customization.published",
    entity: "customization",
    entityId: existing.id,
    meta: { slug: updated.slug },
  });
  return NextResponse.json({ ok: true, slug: updated.slug, url: `${env.siteUrl}/w/${updated.slug}` });
}
