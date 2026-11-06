import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasServiceRole } from "@/lib/env";
import { localModeEnabled } from "@/lib/local/config";
import { localDataClient } from "@/lib/local/client";
import { supabaseDataClient } from "@/lib/db/supabase-adapter";
import type { DataClient } from "@/lib/db/core";

/**
 * Service-role data client: bypasses RLS. SERVER ONLY.
 *
 * - Supabase configured → service-role supabase-js client (production).
 * - No Supabase + local mode → embedded Postgres (development/preview).
 *
 * Never import this from a client component.
 */
let cachedRaw: SupabaseClient | null = null;
let cachedClient: DataClient | null = null;

function rawSupabase(): SupabaseClient {
  if (!hasServiceRole()) {
    throw new Error(
      "Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
    );
  }
  if (!cachedRaw) {
    cachedRaw = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedRaw;
}

export function getServiceSupabase(): DataClient {
  if (hasServiceRole()) {
    if (!cachedClient) cachedClient = supabaseDataClient(rawSupabase());
    return cachedClient;
  }
  if (localModeEnabled()) return localDataClient();
  throw new Error(
    "Database is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).",
  );
}

/** Like getServiceSupabase but returns null instead of throwing (build-time safety). */
export function safeServiceSupabase(): DataClient | null {
  try {
    return hasServiceRole() || localModeEnabled() ? getServiceSupabase() : null;
  } catch {
    return null;
  }
}
