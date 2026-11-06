import { Pagination } from "@/components/pagination";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { Badge, EmptyState } from "@/components/ui";
import type { AuditLog } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit logs" };

const PAGE_SIZE = 40;

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { entity?: string; page?: string };
}) {
  const sb = safeServiceSupabase();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const entity = (searchParams.entity ?? "").trim();

  let logs: AuditLog[] = [];
  let total = 0;
  if (sb) {
    let q = sb.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (entity) {
      const safe = entity.replace(/[%_\\]/g, "").slice(0, 60);
      q = q.or(`entity.ilike.%${safe}%,action.ilike.%${safe}%`);
    }
    const { data, count } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    logs = (data ?? []) as AuditLog[];
    total = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Audit logs</h2>
      <p className="text-sm text-charcoal-muted">Every admin mutation, payment event and RBAC change — append-only.</p>

      <form action="/admin/audit-logs" className="card flex flex-wrap items-end gap-3 p-4" role="search">
        <div>
          <label className="label" htmlFor="aq">Filter by action or entity</label>
          <input id="aq" name="entity" defaultValue={entity} className="input w-72" placeholder="product / order / role…" />
        </div>
        <button className="btn-burgundy px-4 py-2 text-sm">Filter</button>
      </form>

      {logs.length === 0 ? (
        <EmptyState title="No audit entries" message="Activity appears here as admins work." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8DFCE] bg-cream">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-[#EFE7D6] text-left text-xs uppercase tracking-wide text-charcoal-muted">
                <th className="p-3">When</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-[#F5EFE3] last:border-0">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="p-3 text-xs">{l.actor_email ?? l.actor_user_id ?? "system"}</td>
                  <td className="p-3"><Badge tone="gray">{l.action}</Badge></td>
                  <td className="p-3">{l.entity}</td>
                  <td className="p-3 max-w-[220px] truncate font-mono text-xs" title={l.entity_id ?? ""}>{l.entity_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} makeHref={(p) => `/admin/audit-logs?entity=${encodeURIComponent(entity)}&page=${p}`} />
    </div>
  );
}
