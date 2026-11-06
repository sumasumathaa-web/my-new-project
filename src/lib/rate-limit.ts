/**
 * Simple in-memory sliding-window rate limiter for sensitive endpoints
 * (login, coupon validation, checkout, registration).
 *
 * NOTE: suitable for a single long-running Node process. On serverless
 * platforms swap this for a durable limiter (e.g. Upstash Ratelimit) — the
 * call sites only depend on this one function.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically evict expired buckets to bound memory.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

export function rateLimit(opts: {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);
  const id = `${opts.scope}:${opts.key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
