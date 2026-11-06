import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env, hasSupabase } from "@/lib/env";
import { localModeEnabled } from "@/lib/local/config";
import { localDataClient } from "@/lib/local/client";
import { supabaseDataClient } from "@/lib/db/supabase-adapter";
import type { DataClient } from "@/lib/db/core";

/**
 * Cookie-bound data client for Server Components & Route Handlers.
 * In Supabase mode this carries the end-user session (RLS applies as that user);
 * in local mode it talks to the embedded Postgres (authorization enforced by the
 * application's server-side checks and layout guards).
 */
export function getServerSupabase(): DataClient {
  if (!hasSupabase() && localModeEnabled()) return localDataClient();
  const cookieStore = cookies();
  const client = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* called from a Server Component — middleware refreshes tokens */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* noop */
        }
      },
    },
  });
  return supabaseDataClient(client);
}

export function safeServerSupabase(): DataClient | null {
  return hasSupabase() || localModeEnabled() ? getServerSupabase() : null;
}
