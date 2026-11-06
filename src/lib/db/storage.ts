/** Supabase Storage helpers (server only). */
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB

export const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
export const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function extensionFor(mime: string): string {
  return (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
      "application/pdf": "pdf",
    }[mime] ?? "bin"
  );
}

export { isStoragePath, mediaUrl } from "@/lib/media";
export function publicUrl(bucket: string, path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadObject(params: {
  bucket: string;
  path: string;
  data: ArrayBuffer | Uint8Array;
  contentType: string;
}): Promise<{ path: string }> {
  const sb = safeServiceSupabase();
  if (!sb) throw new Error("Storage is not configured.");
  const { error } = await sb.storage.from(params.bucket).upload(params.path, params.data, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path: params.path };
}

export async function removeObject(bucket: string, path: string): Promise<void> {
  const sb = safeServiceSupabase();
  if (!sb) return;
  await sb.storage.from(bucket).remove([path]);
}

export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string | null> {
  const sb = safeServiceSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export interface StoredObject {
  name: string;
  size: number;
  created_at: string | null;
}

export async function listObjects(
  bucket: string,
  prefix = "",
  limit = 100
): Promise<{ items: StoredObject[]; folders: string[] }> {
  const empty = { items: [] as StoredObject[], folders: [] as string[] };
  const sb = safeServiceSupabase();
  if (!sb) return empty;
  const { data } = await sb.storage.from(bucket).list(prefix, { limit, sortBy: { column: "created_at", order: "desc" } });
  const items: StoredObject[] = [];
  const folders: string[] = [];
  for (const f of data ?? []) {
    // Storage API returns folders with a null id and no metadata
    const meta = (f as { metadata?: { size?: number } | null }).metadata;
    if (!meta || typeof meta.size !== "number") {
      folders.push((f as { name: string }).name);
      continue;
    }
    items.push({
      name: (f as { name: string }).name,
      size: meta.size,
      created_at: ((f as { created_at?: string | null }).created_at ?? null) as string | null,
    });
  }
  return { items, folders };
}
