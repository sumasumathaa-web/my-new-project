import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { safeServerSupabase } from "@/lib/supabase/server";
import { safeServiceSupabase } from "@/lib/supabase/admin";

/** Returns the authenticated user or null (never throws during build). */
export async function getSessionUser(): Promise<User | null> {
  const sb = safeServerSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const sb = safeServiceSupabase();
  if (!sb) return [];
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

export async function isAdminId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const roles = await getUserRoles(userId);
  return roles.includes("admin");
}

/** Redirects to /login when unauthenticated. Returns the user. */
export async function requireUser(nextPath: string): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Restricts a server page to admins. Redirects non-admins. */
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin")}`);
  const admin = await isAdminId(user.id);
  if (!admin) redirect("/?error=unauthorized");
  return user;
}

/** For API routes: returns [user, roles] or null. */
export async function getApiAuth(): Promise<{ user: User; isAdmin: boolean } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, isAdmin: await isAdminId(user.id) };
}
