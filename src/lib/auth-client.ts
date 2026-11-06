/**
 * Client-side auth helpers.
 *
 * Production: delegates to Supabase Auth in the browser (cookie session via @supabase/ssr).
 * Local dev: posts to /api/auth/* which authenticates against the embedded Postgres.
 *
 * Components stay identical in both modes.
 */
import { getBrowserSupabase } from "@/lib/supabase/client";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function postLocal(path: string, body: Record<string, unknown>): Promise<{ error: string | null; ok: boolean; payload: unknown }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { error: payload.error ?? "Something went wrong. Please try again.", ok: false, payload };
    return { error: null, ok: true, payload };
  } catch {
    return { error: "Could not reach the server. Check your connection.", ok: false, payload: null };
  }
}

export async function signInClient(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured()) {
    const res = await postLocal("/api/auth/login", { email, password });
    return { error: res.error };
  }
  const { error } = await getBrowserSupabase().auth.signInWithPassword({ email, password });
  return { error: error ? "Invalid email or password." : null };
}

export async function signUpClient(
  email: string,
  password: string,
  fullName: string,
  next: string,
): Promise<{ error: string | null; hasSession: boolean }> {
  if (!supabaseConfigured()) {
    const res = await postLocal("/api/auth/register", { email, password, fullName });
    return { error: res.error, hasSession: res.ok };
  }
  const { data, error } = await getBrowserSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  return { error: error?.message ?? null, hasSession: Boolean(data.session) };
}

export async function signOutClient(): Promise<void> {
  if (!supabaseConfigured()) {
    await postLocal("/api/auth/logout", {});
    return;
  }
  await getBrowserSupabase().auth.signOut();
}

export async function requestPasswordResetClient(email: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured()) {
    const res = await postLocal("/api/auth/reset-request", { email });
    return { error: res.error };
  }
  const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset`,
  });
  return { error: error?.message ?? null };
}

export async function hasRecoverySessionClient(): Promise<boolean> {
  if (!supabaseConfigured()) {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("token"));
  }
  const { data } = await getBrowserSupabase().auth.getSession();
  return Boolean(data.session);
}

export async function updatePasswordClient(password: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured()) {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const res = await postLocal("/api/auth/reset-confirm", { token, password });
    return { error: res.error };
  }
  const { error } = await getBrowserSupabase().auth.updateUser({ password });
  return { error: error?.message ?? null };
}
