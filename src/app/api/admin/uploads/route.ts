import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { uploadObject } from "@/lib/db/storage";
import { safeServiceSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 60 * 1024 * 1024;
const BUCKET = "public-media";
const ALLOWED_PREFIXES = new Set(["products", "themes", "hero", "brand", "invites", "misc"]);

function safeSegment(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
}

/** Admin file upload to the public-media bucket (images ≤5MB, videos ≤60MB). */
export async function POST(request: Request) {
  const auth = await getApiAuth();
  if (!auth?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const sessionUser = auth.user;
  const rlUpload = rateLimit({ scope: "admin-upload", key: sessionUser.id + clientIpFromHeaders(request.headers), limit: 30, windowMs: 60_000 });
  if (!rlUpload.ok) return NextResponse.json({ error: "Too many uploads — slow down." }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  const prefixRaw = String(form.get("prefix") ?? "misc");
  const prefix = ALLOWED_PREFIXES.has(prefixRaw) ? prefixRaw : "misc";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  }
  const isImage = file.type.startsWith("image/");
  const isVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
  if (!isImage && !isVideo) return NextResponse.json({ error: "Only images (≤5MB) and MP4/WebM videos (≤60MB) are allowed." }, { status: 400 });
  if (isImage && file.size > IMAGE_MAX) return NextResponse.json({ error: "Image too large (5 MB max)." }, { status: 400 });
  if (isVideo && file.size > VIDEO_MAX) return NextResponse.json({ error: "Video too large (60 MB max)." }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const path = `${prefix}/${Date.now()}-${safeSegment(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;

  try {
    await uploadObject({ bucket: BUCKET, path, data: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }

  const sb = safeServiceSupabase();
  if (sb) {
    await sb.from("files").insert({
      bucket: BUCKET,
      path,
      size_bytes: file.size,
      mime: file.type,
      uploaded_by: sessionUser.id,
      kind: isVideo ? "video" : "image",
    });
  }

  return NextResponse.json({ ok: true, bucket: BUCKET, path });
}
