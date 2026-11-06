/**
 * Pure media-URL helpers safe for client components (no server-only imports).
 *
 * Supabase Storage public URLs in production; the /media route in local mode.
 */
import { env } from "@/lib/env";
import { localModeEnabled } from "@/lib/local/config";

export function storagePublicUrl(bucket: string, path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/** True when a product/media path points to a storage object (not an absolute URL). */
export function isStoragePath(p: string | null | undefined): p is string {
  return Boolean(p && !p.startsWith("http") && p.length > 2 && p.length < 400);
}

export function mediaUrl(path: string | null | undefined, bucket?: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  const targetBucket = bucket ?? env.bucketPublic;
  if (localModeEnabled()) return `/media/${targetBucket}/${path.replace(/^\/+/, "")}`;
  return storagePublicUrl(targetBucket, path);
}
