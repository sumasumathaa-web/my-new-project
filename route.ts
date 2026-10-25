import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { getProductById } from "@/lib/db/catalog";
import { createCustomization, getUserCustomization, updateCustomization } from "@/lib/db/customizations";
import { DEFAULT_INVITE_SCHEMA } from "@/lib/customization-schema";
import { requireString, sanitizeText, validateCustomizationPayload } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Save a customization draft (create or update). Config validated against the product schema. */
export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "customization", key: auth.user.id + ip, limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many saves. Slow down." }, { status: 429 });

  let body: { id?: string; productId?: string; title?: string; config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "Customization payload missing." }, { status: 400 });
  }

  try {
    if (body.id) {
      const existing = await getUserCustomization(String(body.id), auth.user.id);
      if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const product = existing.product_id ? await getProductById(existing.product_id, true) : null;
      const schema = product?.customization_schema?.length ? product.customization_schema : DEFAULT_INVITE_SCHEMA;
      const result = validateCustomizationPayload(schema, body.config);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      const title = body.title ? sanitizeText(requireString(body.title, "Title", { max: 120 })) : existing.title;
      const updated = await updateCustomization({ id: existing.id, userId: auth.user.id, title, config: result.cleaned });
      await logAudit({ actorUserId: auth.user.id, action: "customization.saved", entity: "customization", entityId: updated.id });
      return NextResponse.json({ ok: true, id: updated.id, version: updated.version, slug: updated.slug });
    }

    if (!body.productId) return NextResponse.json({ error: "productId is required." }, { status: 400 });
    const product = await getProductById(String(body.productId), true);
    if (!product) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const schema = product.customization_schema?.length ? product.customization_schema : DEFAULT_INVITE_SCHEMA;
    const result = validateCustomizationPayload(schema, body.config);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const title = body.title ? sanitizeText(requireString(body.title, "Title", { max: 120 })) : `${product.name}`;
    const created = await createCustomization({
      userId: auth.user.id,
      productId: product.id,
      productName: product.name,
      title,
      config: result.cleaned,
    });
    await logAudit({ actorUserId: auth.user.id, action: "customization.created", entity: "customization", entityId: created.id });
    return NextResponse.json({ ok: true, id: created.id, version: 1, slug: created.slug });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed." }, { status: 400 });
  }
}
