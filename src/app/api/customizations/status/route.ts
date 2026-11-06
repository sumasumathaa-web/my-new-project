import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { getUserCustomization, restoreRevision, setCustomizationStatus } from "@/lib/db/customizations";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: { id?: string; action?: "unpublish" | "archive" | "restore"; version?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const existing = await getUserCustomization(String(body.id), auth.user.id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    if (body.action === "restore") {
      const version = Number(body.version);
      if (!Number.isFinite(version)) return NextResponse.json({ error: "version is required." }, { status: 400 });
      const updated = await restoreRevision({ id: existing.id, userId: auth.user.id, revisionVersion: version });
      await logAudit({ actorUserId: auth.user.id, action: "customization.revision_restored", entity: "customization", entityId: existing.id, meta: { version } });
      return NextResponse.json({ ok: true, version: updated.version, config: updated.config });
    }
    if (body.action === "unpublish" || body.action === "archive") {
      const status = body.action === "archive" ? "archived" : "draft";
      await setCustomizationStatus({ id: existing.id, userId: auth.user.id, status });
      await logAudit({ actorUserId: auth.user.id, action: `customization.${body.action}`, entity: "customization", entityId: existing.id });
      return NextResponse.json({ ok: true, status });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 400 });
  }
}
