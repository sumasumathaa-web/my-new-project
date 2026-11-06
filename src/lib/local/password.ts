import crypto from "node:crypto";

/**
 * Password hashing for the embedded (development) auth store.
 * Supabase Auth handles hashing in production — this exists only so the local
 * database mode can authenticate users without GoTrue.
 */
const KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password.normalize("NFKC"), salt, KEYLEN, SCRYPT_OPTS, (err, key) =>
      err ? reject(err) : resolve(key as Buffer),
    );
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password.normalize("NFKC"), salt, expected.length, SCRYPT_OPTS, (err, key) =>
      err ? reject(err) : resolve(key as Buffer),
    );
  });
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
