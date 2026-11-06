import type { PGlite } from "@electric-sql/pglite";

/**
 * Decouples the embedded Postgres (imported lazily) from the query engine, so
 * bundlers never pull WebAssembly into the production/Supabase path.
 */
export interface LocalState {
  db: PGlite;
  columns: Map<string, Map<string, { type: string; nullable: boolean }>>;
  primaryKeys: Map<string, string[]>;
  foreignKeys: { table: string; column: string; foreignTable: string; foreignColumn: string }[];
}

type Provider = () => Promise<LocalState>;

let provider: Provider | null = null;
let pending: Promise<LocalState> | null = null;

export function registerLocalState(next: Provider): void {
  provider = next;
}

/** Loads the embedded database module on first use, then keeps the instance. */
export async function getLocalState(): Promise<LocalState> {
  if (!provider) {
    if (process.env.NEXT_RUNTIME === "edge") {
      throw new Error("The local database is not available on the edge runtime.");
    }
    await import("@/lib/local/pglite");
    if (!provider) throw new Error("Local database provider failed to register.");
  }
  if (!pending) pending = provider();
  return pending;
}
