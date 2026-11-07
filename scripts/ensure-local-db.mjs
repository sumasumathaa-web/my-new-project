#!/usr/bin/env node
/**
 * Creates the embedded Postgres data directory *before* Next.js starts.
 *
 * Why: PGlite's `initdb` runs PostgreSQL's bootstrap inside a WASM runtime, and
 * doing that inside the Next dev server process can abort on memory constraints
 * (you then get an empty storefront because every query silently falls back).
 * Creating the cluster here — in a plain Node process — is reliable, and the dev
 * server then only *opens* it and applies migrations/seed itself.
 *
 * Usage:
 *   node scripts/ensure-local-db.mjs            # create if missing (npm run dev does this)
 *   node scripts/ensure-local-db.mjs --reset    # wipe and recreate
 */
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), process.env.LOCAL_DB_DIR ?? ".data/pglite");
const reset = process.argv.includes("--reset");

if (reset && fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`[local-db] removed ${path.relative(process.cwd(), dataDir)}`);
}

const marker = path.join(dataDir, "PG_VERSION");
if (fs.existsSync(marker)) {
  console.log(`[local-db] cluster already present at ${path.relative(process.cwd(), dataDir)}`);
  process.exit(0);
}

const { PGlite } = await import("@electric-sql/pglite");
fs.mkdirSync(dataDir, { recursive: true });

try {
  const db = await PGlite.create({ dataDir });
  await db.close();
  console.log(`[local-db] created ${path.relative(process.cwd(), dataDir)} — schema + demo data are applied on first request`);
} catch (error) {
  console.error(`[local-db] could not create the embedded database: ${error?.message ?? error}`);
  console.error("[local-db] The storefront will still load, but with default content and no products.");
  process.exitCode = 1;
}
