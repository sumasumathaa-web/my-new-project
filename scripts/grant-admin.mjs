/**
 * grant-admin.mjs — create/sign-in a user and grant the "admin" role.
 * Usage:
 *   node scripts/grant-admin.mjs admin@example.com "Sup3rSecret!" --create   # create account
 *   node scripts/grant-admin.mjs admin@example.com                          # just grant role
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_DB_URL from .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// Load .env.local without extra deps
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
} catch {}

const [email, password, ...flags] = process.argv.slice(2);
if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
  console.error('Usage: node scripts/grant-admin.mjs <email> ["<password>"] [--create]');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL; // psql connection string, e.g., postgres://postgres.<ref>:...@aws-0-...pooler.supabase.com:5432/postgres
if (!url || !serviceKey || !dbUrl) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_DB_URL in .env.local first.");
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function findUserId() {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, { headers: authHeaders });
  if (res.status === 404 || res.status === 401) return null;
  const data = await res.json();
  const users = data.users ?? data;
  return (users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function lookupAllPages() {
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=50`, { headers: authHeaders });
    const data = await res.json();
    const users = data.users ?? data;
    const hit = (users ?? []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (!users || users.length < 50) break;
  }
  return null;
}

async function createUser() {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`createUser failed (${res.status}): ${data.msg ?? JSON.stringify(data)}`);
  return data.user?.id ?? data.id;
}

let userId = await lookupAllPages();
if (!userId) {
  if (flags.includes("--create") && password && password.length >= 8) {
    userId = await createUser();
    console.log("Created user:", userId);
  } else {
    console.error(`No user with email ${email}. Pass a password (min 8 chars) and --create to create it.`);
    process.exit(1);
  }
} else {
  console.log("Found user:", userId);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("insert into public.profiles (id, email) values ($1, $2) on conflict (id) do nothing", [userId, email]);
  for (const role of ["customer", "admin"]) {
    await client.query("insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing", [userId, role]);
  }
  console.log(`✓ ${email} now has the admin role.`);
  console.log(`  Sign in at ${url.replace(`https://${ref}.supabase.co`, "<your-site-url>")}/login then open /admin`);
} finally {
  await client.end();
}
