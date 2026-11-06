#!/usr/bin/env node
/**
 * Applies supabase/seed.sql to the project database.
 * Usage: SUPABASE_DB_URL=postgresql://... node scripts/seed.mjs
 * (Or rely on .env.local's SUPABASE_DB_URL.)
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Minimal .env.local reader (no dotenv dependency)
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Set SUPABASE_DB_URL (see .env.example).");
  process.exit(1);
}

const sql = readFileSync(join(root, "supabase", "seed.sql"), "utf8");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  const { rows } = await client.query(`
    select
      (select count(*) from public.products) as products,
      (select count(*) from public.categories) as categories,
      (select count(*) from public.themes) as themes,
      (select count(*) from public.quotes) as quotes,
      (select count(*) from public.faqs) as faqs,
      (select count(*) from public.coupons) as coupons;
  `);
  console.log("Seed applied:", rows[0]);
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("Seed failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
