import { NextResponse } from "next/server";
import crypto from "crypto";
import { getApiAuth } from "@/lib/auth";
import { extensionFor, IMAGE_MIME, MAX_IMAGE_BYTES, uploadObject } from "@/lib/db/storage";
import { env } from "@/lib/env";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Customer uploads (invitation photos).
 * Files land in the PUBLIC bucket under invites/<uid>/ because published
 * invitation pages are public by design. Admin media uses /admin/media.
 */
export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "upload", key: auth.user.id + ip, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file included." }, { status: 400 });

  // Validation: images only, bounded size, whitelisted MIME
  if (!IMAGE_MIME.has(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP, GIF or SVG images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Images must be under 5 MB." }, { status: 400 });
  }

  const ext = extensionFor(file.type);
  const path = `invites/${auth.user.id}/${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  try {
    await uploadObject({ bucket: env.bucketPublic, path, data: buffer, contentType: file.type });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
  const sb = safeServiceSupabase();
  await sb?.from("files").insert({
    bucket: env.bucketPublic,
    path,
    owner_user_id: auth.user.id,
    kind: "image",
    mime: file.type,
    size_bytes: file.size,
    is_public: true,
    uploaded_by: auth.user.id,
  });
  await logAudit({ actorUserId: auth.user.id, action: "file.uploaded", entity: "file", entityId: `${env.bucketPublic}/${path}` });
  return NextResponse.json({ ok: true, path });
}
