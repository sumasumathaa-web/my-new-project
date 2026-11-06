/**
 * DataClient implementation backed by the embedded Postgres.
 * Kept free of static `@electric-sql/pglite` imports so the Supabase build never
 * bundles WebAssembly; the database module loads lazily on first query.
 */
import type { DataClient } from "@/lib/db/core";
import { LocalQuery } from "@/lib/local/query";
import { localStorageApi } from "@/lib/local/storage";
import { localAuthApi } from "@/lib/local/auth";
import { getLocalState } from "@/lib/local/registry";

let initialised = false;

export function localDataClient(): DataClient {
  if (!initialised) {
    initialised = true;
    getLocalState().catch((error) => {
      console.error("[local-db] failed to initialise embedded database:", error);
    });
  }
  return {
    from<T = any>(table: string) {
      return new LocalQuery<T>(table);
    },
    storage: localStorageApi(),
    auth: localAuthApi(),
  };
}
