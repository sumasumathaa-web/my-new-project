import { NextRequest } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { isPublicBucket, readLocalObject, verifyMediaSignature } from "@/lib/local/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves locally stored media in development. Public buckets are open; private
 * buckets (customer uploads, deliverables) require a valid signed URL.
 * Disabled whenever Supabase Storage is in use.
 */
export async function GET(request: NextRequest, { params }: { params: { segments: string[] } }) {
  if (!localModeEnabled()) return new Response("Not found", { status: 404 });
  const [bucket, ...rest] = params.segments ?? [];
  if (!bucket || rest.length === 0) return new Response("Not found", { status: 404 });
  const key = rest.join("/");

  if (!isPublicBucket(bucket)) {
    const url = new URL(request.url);
    const valid = verifyMediaSignature(bucket, key, url.searchParams.get("exp"), url.searchParams.get("sig"));
    if (!valid) return new Response("Forbidden", { status: 403 });
  }

  const file = await readLocalObject(bucket, key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.body.length),
      "cache-control": isPublicBucket(bucket) ? "public, max-age=3600" : "private, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
