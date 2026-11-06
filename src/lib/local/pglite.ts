/**
 * Local development / preview database.
 *
 * Runs a real embedded PostgreSQL (PGlite — Postgres compiled to WebAssembly)
 * and applies the SAME SQL migrations and seed file that you run against
 * Supabase. This is what makes `npm run dev` fully functional with no external
 * services, while production keeps using Supabase untouched.
 *
 * It is only enabled when Supabase is not configured and the app is not
 * running on Vercel (`VERCEL` env var). Never used in production.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "@/lib/local/password";
import { localDataDir } from "@/lib/local/config";
import { registerLocalState, type LocalState } from "@/lib/local/registry";

const PRELUDE_SQL = `
create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  email_confirmed_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Session + password-reset tables (local auth emulates Supabase Auth).
create table if not exists auth.sessions (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists auth.password_resets (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);

create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;
`;

const TEXT_PARSERS: Record<number, (value: string) => unknown> = {
  20: (v) => Number(v), // int8
  1700: (v) => parseFloat(v), // numeric → number (PostgREST parity)
  1082: (v) => v, // date → "YYYY-MM-DD"
  1114: (v) => v, // timestamp
  // PostgREST returns ISO-8601 strings; normalise so string comparisons behave.
  1184: (v) => {
    const normalised = v.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
    const parsed = new Date(normalised);
    return Number.isNaN(parsed.getTime()) ? v : parsed.toISOString();
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __weddingLocalDb: Promise<LocalState> | undefined;
}

export function getLocalState(): Promise<LocalState> {
  if (!globalThis.__weddingLocalDb) {
    globalThis.__weddingLocalDb = (async () => {
      const dir = path.join(process.cwd(), localDataDir());
      fs.mkdirSync(dir, { recursive: true });
      const db = await PGlite.create({ dataDir: dir, parsers: TEXT_PARSERS });
      await bootstrap(db);
      const meta = await introspect(db);
      return { db, ...meta };
    })();
  }
  return globalThis.__weddingLocalDb;
}

registerLocalState(getLocalState);

function readSql(...parts: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

async function bootstrap(db: PGlite): Promise<void> {
  const { rows } = await db.query<{ exists: boolean }>(
    "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'products') as exists",
  );
  if (rows[0]?.exists) return;

  console.log("[local-db] bootstrapping embedded Postgres schema…");
  await db.exec(PRELUDE_SQL);

  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  // Re-run prelude after migrations so storage buckets/tables exist for the seed.
  await db.exec(PRELUDE_SQL);
  await db.exec(readSql("supabase", "seed.sql"));
  await seedLocalUsers(db);
  console.log("[local-db] ready");
}

/**
 * Demo accounts for local development only. Password comes from
 * LOCAL_DEMO_PASSWORD (default documented in README) and is hashed with scrypt.
 */
async function seedLocalUsers(db: PGlite): Promise<void> {
  const password = process.env.LOCAL_DEMO_PASSWORD ?? "Password123!";
  const accounts: { email: string; name: string; role: "admin" | "customer" }[] = [
    { email: "admin@yourbrand.local", name: "Demo Administrator", role: "admin" },
    { email: "customer@yourbrand.local", name: "Demo Customer", role: "customer" },
  ];
  for (const account of accounts) {
    const hash = await hashPassword(password);
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values ($1, $2, $3)
       on conflict (email) do update set encrypted_password = excluded.encrypted_password
       returning id`,
      [account.email, hash, JSON.stringify({ full_name: account.name })],
    );
    const id = rows[0]?.id;
    if (!id) continue;
    if (account.role === "admin") {
      await db.query("insert into public.user_roles (user_id, role) values ($1, 'admin') on conflict do nothing", [id]);
    }
    await db.query("update public.profiles set full_name = coalesce(nullif(full_name, ''), $2) where id = $1", [
      id,
      account.name,
    ]);
  }
}

async function introspect(db: PGlite): Promise<Pick<LocalState, "columns" | "primaryKeys" | "foreignKeys">> {
  const cols = await db.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(
    `select table_name, column_name, data_type, is_nullable
     from information_schema.columns where table_schema = 'public'`,
  );
  const columns = new Map<string, Map<string, { type: string; nullable: boolean }>>();
  for (const row of cols.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Map());
    columns.get(row.table_name)!.set(row.column_name, {
      type: row.data_type,
      nullable: row.is_nullable === "YES",
    });
  }

  const pks = await db.query<{ relname: string; attname: string }>(
    `select c.relname, a.attname
     from pg_index i
     join pg_class c on c.oid = i.indrelid
     join pg_namespace n on n.oid = c.relnamespace
     join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
     where n.nspname = 'public' and i.indisprimary`,
  );
  const primaryKeys = new Map<string, string[]>();
  for (const row of pks.rows) {
    primaryKeys.set(row.relname, [...(primaryKeys.get(row.relname) ?? []), row.attname]);
  }

  const fks = await db.query<{ table_name: string; column_name: string; foreign_table: string; foreign_column: string }>(
    `select tc.table_name, kcu.column_name, ccu.table_name as foreign_table, ccu.column_name as foreign_column
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
     where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`,
  );

  return {
    columns,
    primaryKeys,
    foreignKeys: fks.rows.map((r) => ({
      table: r.table_name,
      column: r.column_name,
      foreignTable: r.foreign_table,
      foreignColumn: r.foreign_column,
    })),
  };
}

