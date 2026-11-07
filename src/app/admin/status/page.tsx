import { env, hasServiceRole } from "@/lib/env";
import { localModeEnabled } from "@/lib/local/config";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { runWriteTestAction } from "@/app/admin/actions-diagnostics";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

type Search = { test?: string; ms?: string; reason?: string };

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T | null; ms: number; error: string | null }> {
  const t0 = Date.now();
  try {
    return { value: await fn(), ms: Date.now() - t0, error: null };
  } catch (e) {
    return { value: null, ms: Date.now() - t0, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export default async function AdminStatusPage({ searchParams }: { searchParams: Search }) {
  const sb = safeServiceSupabase();

  const products = await timed(async () => {
    if (!sb) throw new Error("No database client");
    const { data, error, count } = await sb.from("products").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? data?.length ?? 0;
  });

  const settings = await timed(async () => {
    if (!sb) throw new Error("No database client");
    const { data, error } = await sb.from("site_settings").select("key, updated_at").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  const audit = await timed(async () => {
    if (!sb) throw new Error("No database client");
    const { data, error } = await sb
      .from("audit_logs")
      .select("action, entity, actor_email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  const backend = localModeEnabled()
    ? "Embedded Postgres (local development mode)"
    : hasServiceRole()
      ? "Supabase (service role)"
      : "Not configured";

  const envRows: { key: string; ok: boolean; note?: string }[] = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(env.supabaseUrl), note: env.supabaseUrl ? "set" : "missing" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(env.supabaseAnonKey), note: env.supabaseAnonKey ? "set" : "missing" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", ok: hasServiceRole(), note: hasServiceRole() ? "set (server only)" : "missing" },
    { key: "NEXT_PUBLIC_SITE_URL", ok: Boolean(env.siteUrl), note: env.siteUrl || "missing" },
    { key: "PAYMENTS_TEST_MODE", ok: true, note: env.paymentsTestMode ? "test mode (no live charges)" : "live mode" },
    { key: "EMAIL_PROVIDER", ok: true, note: env.emailProvider },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-charcoal">System status</h2>
        <p className="mt-1 text-sm text-charcoal-muted">
          Everything the admin panel writes goes through the same database path tested here. Use this page
          when a change “doesn’t appear”: it shows the live database round-trip and your most recent saves.
        </p>
      </header>

      {searchParams.test === "ok" ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]" role="status">
          ✅ Write test succeeded in {searchParams.ms ?? "?"} ms — the database accepts writes from this deployment.
        </p>
      ) : null}
      {searchParams.test === "fail" ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy" role="alert">
          ❌ Write test failed after {searchParams.ms ?? "?"} ms: {searchParams.reason ? decodeURIComponent(searchParams.reason) : "unknown error"}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kpi">
          <p className="text-[10px] uppercase tracking-widest2 text-charcoal-muted">Backend</p>
          <p className="mt-1 font-serif text-lg leading-tight text-charcoal">{backend}</p>
        </div>
        <div className="kpi">
          <p className="text-[10px] uppercase tracking-widest2 text-charcoal-muted">Read latency (products)</p>
          <p className="mt-1 font-serif text-lg text-charcoal">
            {products.error ? "—" : `${products.ms} ms`}
            <span className="ml-2 text-xs font-sans text-charcoal-muted">{products.error ? "query failed" : "healthy"}</span>
          </p>
        </div>
        <div className="kpi">
          <p className="text-[10px] uppercase tracking-widest2 text-charcoal-muted">Products in database</p>
          <p className="mt-1 font-serif text-lg text-charcoal">{products.error ? "—" : products.value}</p>
        </div>
      </div>

      {products.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy" role="alert">
          Database read failed: {products.error}
        </p>
      ) : null}

      <section className="card p-5">
        <h3 className="font-serif text-lg text-charcoal">Write test</h3>
        <p className="mt-1 text-sm text-charcoal-muted">
          Writes one audit-log row through the same service-role client used by product, order and
          branding saves, and reports the exact result.
        </p>
        <form action={runWriteTestAction} className="mt-4">
          <button className="btn-burgundy px-5 py-2.5 text-sm">Run write test</button>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-serif text-lg text-charcoal">Environment</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {envRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 border-b border-[#F0E9DA] pb-2 last:border-0">
                <span className="font-mono text-[11px] text-charcoal-soft">{row.key}</span>
                <span className={row.ok ? "badge-green" : "badge-red"}>{row.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-charcoal-muted">
            Secrets are never rendered — only whether they are present.
          </p>
        </section>

        <section className="card p-5">
          <h3 className="font-serif text-lg text-charcoal">Settings rows</h3>
          {settings.error ? (
            <p className="mt-2 text-sm text-burgundy">{settings.error}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(settings.value as { key: string; updated_at: string }[]).map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3 border-b border-[#F0E9DA] pb-2 last:border-0">
                  <span className="font-medium text-charcoal-soft">{row.key}</span>
                  <span className="text-xs text-charcoal-muted">{new Date(row.updated_at).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-charcoal-muted">
            If a timestamp stays at its seed value after you press Save, that form did not reach the database.
          </p>
        </section>
      </div>

      <section className="card p-5">
        <h3 className="font-serif text-lg text-charcoal">Most recent admin actions</h3>
        <p className="mt-1 text-xs text-charcoal-muted">Every save, delete and status change is written here.</p>
        {audit.error ? (
          <p className="mt-2 text-sm text-burgundy">{audit.error}</p>
        ) : (audit.value as { action: string; entity: string; actor_email: string | null; created_at: string }[]).length === 0 ? (
          <p className="mt-3 text-sm text-charcoal-muted">No admin actions recorded yet.</p>
        ) : (
          <div className="table-wrap mt-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-champagne/60 text-[11px] uppercase tracking-widest2 text-charcoal-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Entity</th>
                  <th className="px-4 py-2 font-medium">Who</th>
                  <th className="px-4 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {(audit.value as { action: string; entity: string; actor_email: string | null; created_at: string }[]).map((row, i) => (
                  <tr key={`${row.action}-${i}`} className="border-t border-[#F0E9DA]">
                    <td className="px-4 py-2 font-mono text-xs text-charcoal">{row.action}</td>
                    <td className="px-4 py-2 text-charcoal-soft">{row.entity}</td>
                    <td className="px-4 py-2 text-xs text-charcoal-muted">{row.actor_email ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-charcoal-muted">
                      {new Date(row.created_at).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
