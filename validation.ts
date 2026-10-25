/** Lightweight server-side validation + sanitisation helpers. */

export class ValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function requireString(v: unknown, field: string, opts?: { min?: number; max?: number }): string {
  if (typeof v !== "string") throw new ValidationError(`${field} is required.`, field);
  const s = v.trim();
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 5000;
  if (s.length < min) throw new ValidationError(`${field} is too short.`, field);
  if (s.length > max) throw new ValidationError(`${field} is too long (max ${max} characters).`, field);
  return s;
}

export function optionalString(v: unknown, field: string, opts?: { max?: number }): string | null {
  if (v === undefined || v === null || v === "") return null;
  return requireString(v, field, { min: 1, max: opts?.max ?? 5000 });
}

const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);

/** Strips ASCII control characters; safe plain-text for storage. HTML escaping happens at render. */
export function sanitizeText(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch === TAB || ch === LF) {
      out += ch;
      continue;
    }
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 32 && c !== 127) out += ch;
  }
  return out.trim();
}

export function isEmail(v: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(v);
}

export function isPhone(v: string): boolean {
  return /^\+?[0-9][0-9\s-]{6,15}$/.test(v.trim());
}

export function isSlug(v: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 120;
}

export function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function toRupeeNumber(v: unknown, field: string, opts?: { min?: number; max?: number }): number {
  const n = typeof v === "string" ? Number(v) : Number(v);
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number.`, field);
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 10_000_000;
  if (n < min) throw new ValidationError(`${field} cannot be less than ${min}.`, field);
  if (n > max) throw new ValidationError(`${field} cannot exceed ${max}.`, field);
  return Math.round(n * 100) / 100;
}

export function toInt(v: unknown, field: string, opts?: { min?: number; max?: number }): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a whole number.`, field);
  if (opts?.min !== undefined && n < opts.min) throw new ValidationError(`${field} is too small.`, field);
  if (opts?.max !== undefined && n > opts.max) throw new ValidationError(`${field} is too large.`, field);
  return n;
}

export function toBoolean(v: unknown): boolean {
  return v === true || v === "true" || v === "on" || v === "1";
}

export function requireEnum<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  throw new ValidationError(`${field} has an invalid value.`, field);
}

export function parseStringArray(v: unknown, opts?: { max?: number; maxLen?: number }): string[] {
  if (!Array.isArray(v)) return [];
  const max = opts?.max ?? 50;
  const maxLen = opts?.maxLen ?? 80;
  return v
    .slice(0, max)
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, maxLen))
    .filter(Boolean);
}

export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validates a customization payload against a product/template field schema. */
export function validateCustomizationPayload(
  schema: Array<{
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    maxLength?: number;
  }>,
  config: Record<string, unknown>,
): { ok: true; cleaned: Record<string, unknown> } | { ok: false; error: string } {
  const cleaned: Record<string, unknown> = {};
  for (const field of schema) {
    const raw = config[field.key];
    const empty = raw === undefined || raw === null || raw === "";
    if (field.required && empty) {
      return { ok: false, error: `"${field.label}" is required.` };
    }
    if (empty) continue;
    switch (field.type) {
      case "select": {
        const s = String(raw);
        if (field.options && !field.options.includes(s)) {
          return { ok: false, error: `"${field.label}" must be one of the listed options.` };
        }
        cleaned[field.key] = s;
        break;
      }
      case "date": {
        const s = String(raw);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: `"${field.label}" must be a valid date.` };
        cleaned[field.key] = s;
        break;
      }
      case "time": {
        const s = String(raw);
        if (!/^\d{2}:\d{2}/.test(s)) return { ok: false, error: `"${field.label}" must be a valid time.` };
        cleaned[field.key] = s;
        break;
      }
      case "color": {
        const s = String(raw);
        if (!isHexColor(s)) return { ok: false, error: `"${field.label}" must be a hex colour like #B08D57.` };
        cleaned[field.key] = s;
        break;
      }
      case "url": {
        const s = String(raw);
        if (!isHttpUrl(s)) return { ok: false, error: `"${field.label}" must be a valid URL.` };
        cleaned[field.key] = s;
        break;
      }
      case "checkbox":
        cleaned[field.key] = toBoolean(raw);
        break;
      case "image": {
        // storage path set by a prior upload call; accept safe storage paths only
        const s = String(raw);
        if (!/^[a-z0-9/._-]{1,300}$/i.test(s)) return { ok: false, error: `"${field.label}" image is invalid.` };
        cleaned[field.key] = s;
        break;
      }
      default: {
        const max = field.maxLength ?? 2000;
        const s = String(raw);
        if (s.length > max) return { ok: false, error: `"${field.label}" exceeds ${max} characters.` };
        cleaned[field.key] = s;
      }
    }
  }
  return { ok: true, cleaned };
}
