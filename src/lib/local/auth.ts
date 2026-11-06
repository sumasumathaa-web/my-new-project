/**
 * Local (development) authentication — mirrors the Supabase Auth methods the app
 * calls: sign up, sign in, sign out, current user, password update, reset.
 * Sessions are HTTP-only cookies backed by rows in auth.sessions.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { AuthApi, AuthSession, AuthUser, DbError } from "@/lib/db/core";
import { getLocalState } from "@/lib/local/registry";
import { hashPassword, verifyPassword, randomToken } from "@/lib/local/password";

export const LOCAL_SESSION_COOKIE = "local_session";
const SESSION_DAYS = 30;

interface UserRow {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
  created_at: string;
}

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    user_metadata: row.raw_user_meta_data ?? {},
    created_at: row.created_at,
  };
}

function toError(message: string, code = "local_auth"): DbError {
  return { message, code };
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const state = await getLocalState();
  const { rows } = await state.db.query<UserRow>(
    "select id, email, encrypted_password, raw_user_meta_data, created_at from auth.users where lower(email) = lower($1)",
    [email],
  );
  return rows[0] ?? null;
}

async function createSession(userId: string): Promise<string> {
  const state = await getLocalState();
  const token = randomToken(32);
  await state.db.query("insert into auth.sessions (token, user_id, expires_at) values ($1, $2, now() + interval '30 days')", [
    token,
    userId,
  ]);
  return token;
}

function setSessionCookie(token: string): void {
  try {
    cookies().set({
      name: LOCAL_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.LOCAL_ALLOW_INSECURE_COOKIE !== "1",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    });
  } catch {
    /* called from a Server Component — route handlers set the cookie */
  }
}

function clearSessionCookie(): void {
  try {
    cookies().set({ name: LOCAL_SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  } catch {
    /* noop */
  }
}

export async function currentLocalUser(): Promise<AuthUser | null> {
  const token = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  const state = await getLocalState();
  const { rows } = await state.db.query<UserRow>(
    `select u.id, u.email, u.raw_user_meta_data, u.created_at, u.encrypted_password
     from auth.sessions s join auth.users u on u.id = s.user_id
     where s.token = $1 and s.expires_at > now()`,
    [token],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

/** Creates a session for an already-authenticated request (used by login route). */
export async function startLocalSession(email: string, password: string): Promise<{ user: AuthUser | null; error: DbError | null }> {
  const user = await findUserByEmail(email);
  if (!user) return { user: null, error: toError("Invalid login credentials") };
  const ok = await verifyPassword(password, user.encrypted_password);
  if (!ok) return { user: null, error: toError("Invalid login credentials") };
  const token = await createSession(user.id);
  setSessionCookie(token);
  return { user: toUser(user), error: null };
}

export async function registerLocalUser(
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<{ user: AuthUser | null; error: DbError | null }> {
  const existing = await findUserByEmail(email);
  if (existing) return { user: null, error: toError("User already registered") };
  const state = await getLocalState();
  const hash = await hashPassword(password);
  const { rows } = await state.db.query<UserRow>(
    `insert into auth.users (email, encrypted_password, raw_user_meta_data)
     values ($1, $2, $3) returning id, email, raw_user_meta_data, created_at, encrypted_password`,
    [email, hash, JSON.stringify(metadata)],
  );
  const row = rows[0];
  if (!row) return { user: null, error: toError("Could not create account") };
  const token = await createSession(row.id);
  setSessionCookie(token);
  return { user: toUser(row), error: null };
}

export async function endLocalSession(): Promise<void> {
  const token = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (token) {
    const state = await getLocalState();
    await state.db.query("delete from auth.sessions where token = $1", [token]);
  }
  clearSessionCookie();
}

export async function updateLocalPassword(password: string): Promise<DbError | null> {
  const user = await currentLocalUser();
  if (!user) return toError("Not authenticated");
  const state = await getLocalState();
  const hash = await hashPassword(password);
  await state.db.query("update auth.users set encrypted_password = $2, updated_at = now() where id = $1", [user.id, hash]);
  return null;
}

/** Issues a single-use reset token and returns the URL to email/log. */
export async function requestLocalPasswordReset(email: string, redirectTo: string): Promise<{ url: string | null; error: DbError | null }> {
  const user = await findUserByEmail(email);
  if (!user) return { url: null, error: null }; // do not leak account existence
  const state = await getLocalState();
  const token = randomToken(24);
  await state.db.query(
    "insert into auth.password_resets (token, user_id, expires_at) values ($1, $2, now() + interval '1 hour')",
    [token, user.id],
  );
  const url = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  return { url, error: null };
}

export async function consumeLocalResetToken(token: string, password: string): Promise<DbError | null> {
  const state = await getLocalState();
  const { rows } = await state.db.query<{ user_id: string }>(
    "select user_id from auth.password_resets where token = $1 and used_at is null and expires_at > now()",
    [token],
  );
  const reset = rows[0];
  if (!reset) return toError("This reset link is invalid or has expired.");
  const hash = await hashPassword(password);
  await state.db.query("update auth.users set encrypted_password = $2, updated_at = now() where id = $1", [reset.user_id, hash]);
  await state.db.query("update auth.password_resets set used_at = now() where token = $1", [token]);
  await state.db.query("delete from auth.sessions where user_id = $1", [reset.user_id]);
  return null;
}

export function localAuthApi(): AuthApi {
  return {
    async getUser() {
      const user = await currentLocalUser();
      return { data: { user }, error: null };
    },
    async getSession() {
      const user = await currentLocalUser();
      if (!user) return { data: { session: null }, error: null };
      const session: AuthSession = { access_token: "local", user };
      return { data: { session }, error: null };
    },
    async signUp({ email, password, options }) {
      const { user, error } = await registerLocalUser(email, password, (options?.data ?? {}) as Record<string, unknown>);
      if (error) return { data: { user: null, session: null }, error };
      return { data: { user, session: user ? { access_token: "local", user } : null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const { user, error } = await startLocalSession(email, password);
      if (error) return { data: { user: null, session: null }, error };
      return { data: { user, session: user ? { access_token: "local", user } : null }, error: null };
    },
    async signOut() {
      await endLocalSession();
      return { error: null };
    },
    async updateUser({ password }) {
      if (password) {
        const error = await updateLocalPassword(password);
        if (error) return { data: { user: null }, error };
      }
      const user = await currentLocalUser();
      return { data: { user }, error: null };
    },
    async resetPasswordForEmail(email, options) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const redirect = options?.redirectTo ?? `${siteUrl}/auth/reset`;
      const { url, error } = await requestLocalPasswordReset(email, redirect);
      if (error) return { data: null, error };
      if (url) {
        // Local-only: no email provider required. The link is printed server-side.
        console.log(`[local-auth] password reset link for ${email}: ${url}`);
      }
      return { data: {}, error: null };
    },
  };
}

/** Used by the local test/seed helpers. */
export function hashForLocalSeed(password: string): Promise<string> {
  return hashPassword(password);
}

export function newLocalToken(): string {
  return crypto.randomUUID();
}
