/**
 * Local mode flag shared by server and browser code.
 * Local mode = no Supabase credentials configured and not running on Vercel.
 */
export function localModeEnabled(): boolean {
  if (process.env.LOCAL_DB === "0") return false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  return true;
}

export function localDataDir(): string {
  return process.env.LOCAL_DB_DIR ?? ".data/pglite";
}

export function localStorageDir(): string {
  return process.env.LOCAL_DB_DIR ? `${process.env.LOCAL_DB_DIR}-storage` : ".data/storage";
}
