/**
 * Database port — the single interface the application talks to.
 *
 * Two implementations satisfy it:
 *   1. Supabase (Postgres + Auth + Storage)  → production
 *   2. PGlite   (embedded Postgres + local auth/storage) → local dev & preview
 *
 * Keeping this interface narrow (only what the app actually uses) means the
 * production path stays 100% Supabase while a machine without Supabase
 * credentials can still run the whole application against a real Postgres.
 */

export interface DbError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export interface DbResult<T = any> {
  data: T | null;
  error: DbError | null;
  count?: number | null;
}

export interface SelectOptions {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

export interface OrderOptions {
  ascending?: boolean;
  nullsFirst?: boolean;
  referencedTable?: string;
}

export type DbQuery<T = any> = PromiseLike<DbResult<T>> & {
  select(columns?: string, options?: SelectOptions): DbQuery<T>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): DbQuery<T>;
  update(values: Record<string, unknown>): DbQuery<T>;
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): DbQuery<T>;
  delete(): DbQuery<T>;
  eq(column: string, value: unknown): DbQuery<T>;
  neq(column: string, value: unknown): DbQuery<T>;
  gt(column: string, value: unknown): DbQuery<T>;
  gte(column: string, value: unknown): DbQuery<T>;
  lt(column: string, value: unknown): DbQuery<T>;
  lte(column: string, value: unknown): DbQuery<T>;
  in(column: string, values: readonly unknown[]): DbQuery<T>;
  is(column: string, value: boolean | null): DbQuery<T>;
  ilike(column: string, pattern: string): DbQuery<T>;
  like(column: string, pattern: string): DbQuery<T>;
  or(filters: string): DbQuery<T>;
  order(column: string, options?: OrderOptions): DbQuery<T>;
  limit(count: number): DbQuery<T>;
  range(from: number, to: number): DbQuery<T>;
  single(): DbQuery<T>;
  maybeSingle(): DbQuery<T>;
};

export interface StorageFile {
  name: string;
  size: number;
  created_at?: string | null;
  metadata?: { size?: number } | null;
  id?: string | null;
}

export interface StorageBucketApi {
  upload(
    path: string,
    data: ArrayBuffer | Uint8Array,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<{ error: DbError | null }>;
  remove(paths: string[]): Promise<{ error: DbError | null }>;
  createSignedUrl(path: string, expiresInSeconds: number): Promise<{ data: { signedUrl: string } | null; error: DbError | null }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
  list(prefix: string, options?: { limit?: number; sortBy?: { column: string; order: "asc" | "desc" } }): Promise<{ data: StorageFile[] | null; error: DbError | null }>;
}

export interface StorageApi {
  from(bucket: string): StorageBucketApi;
}

export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

export interface AuthApi {
  getUser(): Promise<{ data: { user: AuthUser | null }; error: DbError | null }>;
  getSession(): Promise<{ data: { session: AuthSession | null }; error: DbError | null }>;
  signUp(params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }): Promise<{ data: { user: AuthUser | null; session: AuthSession | null }; error: DbError | null }>;
  signInWithPassword(params: { email: string; password: string }): Promise<{
    data: { user: AuthUser | null; session: AuthSession | null };
    error: DbError | null;
  }>;
  signOut(): Promise<{ error: DbError | null }>;
  updateUser(params: { password?: string; data?: Record<string, unknown> }): Promise<{
    data: { user: AuthUser | null };
    error: DbError | null;
  }>;
  resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ data: unknown; error: DbError | null }>;
}

export interface DataClient {
  from<T = any>(table: string): DbQuery<T>;
  storage: StorageApi;
  auth: AuthApi;
}
