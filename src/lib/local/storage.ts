/**
 * Local object storage for development: files live under .data/storage/<bucket>/…
 * Public buckets are served from /media/<bucket>/<path>; private buckets require
 * an HMAC-signed, time-limited URL (same contract as Supabase signed URLs).
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { DbError, StorageApi, StorageBucketApi, StorageFile } from "@/lib/db/core";
import { localStorageDir } from "@/lib/local/config";

export const PUBLIC_BUCKETS = new Set(["public-media"]);

function root(): string {
  return path.resolve(process.cwd(), localStorageDir());
}

function mediaSecret(): string {
  return process.env.LOCAL_MEDIA_SECRET ?? "local-dev-media-secret-change-me";
}

export function isPublicBucket(bucket: string): boolean {
  return PUBLIC_BUCKETS.has(bucket);
}

export function signMediaPath(bucket: string, key: string, expiresInSeconds = 3600): string {
  const exp = Date.now() + expiresInSeconds * 1000;
  const sig = crypto.createHmac("sha256", mediaSecret()).update(`${bucket}/${key}:${exp}`).digest("hex");
  return `/media/${bucket}/${key}?exp=${exp}&sig=${sig}`;
}

export function verifyMediaSignature(bucket: string, key: string, exp: string | null, sig: string | null): boolean {
  if (!exp || !sig) return false;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = crypto.createHmac("sha256", mediaSecret()).update(`${bucket}/${key}:${expiresAt}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function resolveKey(bucket: string, filePath: string): { absolute: string; key: string } {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(bucket)) throw new Error("Invalid storage bucket");
  const segments = filePath.split("/").filter(Boolean);
  if (segments.length === 0) throw new Error("Invalid file path");
  for (const segment of segments) {
    if (segment === ".." || segment === "." || segment.startsWith(".")) throw new Error("Invalid file path");
  }
  const bucketRoot = path.join(root(), bucket);
  const absolute = path.join(bucketRoot, ...segments);
  if (!absolute.startsWith(bucketRoot + path.sep)) throw new Error("Invalid file path");
  return { absolute, key: segments.join("/") };
}

function bucketApi(bucket: string): StorageBucketApi {
  return {
    async upload(filePath, data, options) {
      try {
        const { absolute } = resolveKey(bucket, filePath);
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        if (!options?.upsert) {
          const exists = await fs
            .stat(absolute)
            .then(() => true)
            .catch(() => false);
          if (exists) return { error: { message: "The resource already exists", code: "Duplicate" } as DbError };
        }
        const buffer = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
        await fs.writeFile(absolute, buffer);
        return { error: null };
      } catch (error) {
        return { error: { message: (error as Error).message } };
      }
    },
    async remove(paths) {
      try {
        for (const filePath of paths) {
          const { absolute } = resolveKey(bucket, filePath);
          await fs.rm(absolute, { force: true });
        }
        return { error: null };
      } catch (error) {
        return { error: { message: (error as Error).message } };
      }
    },
    async createSignedUrl(filePath, expiresInSeconds) {
      try {
        const { key } = resolveKey(bucket, filePath);
        return { data: { signedUrl: isPublicBucket(bucket) ? `/media/${bucket}/${key}` : signMediaPath(bucket, key, expiresInSeconds) }, error: null };
      } catch (error) {
        return { data: null, error: { message: (error as Error).message } };
      }
    },
    getPublicUrl(filePath) {
      try {
        const { key } = resolveKey(bucket, filePath);
        return { data: { publicUrl: `/media/${bucket}/${key}` } };
      } catch {
        return { data: { publicUrl: "" } };
      }
    },
    async list(prefix) {
      try {
        const folder = prefix ? resolveKey(bucket, prefix).absolute : path.join(root(), bucket);
        const entries = await fs.readdir(folder, { withFileTypes: true });
        const items: StorageFile[] = [];
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const stat = await fs.stat(path.join(folder, entry.name));
          items.push({ name: entry.name, size: stat.size, created_at: stat.mtime.toISOString(), metadata: { size: stat.size }, id: entry.name });
        }
        return { data: items, error: null };
      } catch {
        return { data: [], error: null };
      }
    },
  };
}

export function localStorageApi(): StorageApi {
  return { from: bucketApi };
}

/** Reads a stored object for the /media route. */
export async function readLocalObject(bucket: string, key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const { absolute } = resolveKey(bucket, key);
    const body = await fs.readFile(absolute);
    return { body, contentType: contentTypeFor(key) };
  } catch {
    return null;
  }
}

function contentTypeFor(key: string): string {
  const ext = path.extname(key).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".json": "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}
