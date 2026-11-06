import { safeServiceSupabase } from "@/lib/supabase/admin";
import { setUserRoleAction } from "../actions-site";
import { Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles & access" };

const ROLES = ["admin", "editor", "support", "customer"] as const;
const ROLE_HELP: Record<string, string> = {
  admin: "Full access to every admin area, orders, refunds, settings and roles.",
  editor: "Reserved for content work (uses admin guard today — refine policies as you grow).",
  support: "Reserved for support work (uses admin guard today).",
  customer: "Standard shopper account. Granted automatically on signup.",
};

interface RoleRow { user_id: string; role: string }
interface ProfileLite { id: string; email: string | null; full_name: string | null }

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: { q?: string; saved?: string; error?: string };
}) {
  const sb = safeServiceSupabase();

  // All non-custom role assignments + matched profiles
  const { data: roleRows } = sb ? await sb.from("user_roles").select("user_id, role") : { data: [] };
  const staff = ((roleRows ?? []) as RoleRow[]).filter((r) => r.role !== "customer" && r.role !== null);
  const staffIds = [...new Set(staff.map((r) => r.user_id))];
  let staffProfiles: ProfileLite[] = [];
  if (sb && staffIds.length) {
    const { data } = await sb.from("profiles").select("id, email, full_name").in("id", staffIds);
    staffProfiles = (data ?? []) as ProfileLite[];
  }
  const profileById = new Map(staffProfiles.map((p) => [p.id, p]));

  // Search results
  const q = (searchParams.q ?? "").trim();
  let searchResults: Array<ProfileLite & { roles: string[] }> = [];
  if (sb && q) {
    const safe = q.replace(/[%_\\]/g, "").slice(0, 80);
    const { data } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
      .limit(10);
    const rows = (data ?? []) as ProfileLite[];
    const ids = rows.map((r) => r.id);
    const userRoles = new Map<string, string[]>();
    if (ids.length) {
      const { data: rr } = await sb.from("user_roles").select("user_id, role").in("user_id", ids);
      for (const r of (rr ?? []) as RoleRow[]) {
        const cur = userRoles.get(r.user_id) ?? [];
        cur.push(r.role);
        userRoles.set(r.user_id, cur);
      }
    }
    searchResults = rows.map((r) => ({ ...r, roles: userRoles.get(r.id) ?? ["customer"] }));
  }

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-2xl text-charcoal">Roles &amp; access</h2>
      <p className="text-sm text-charcoal-muted">
        The first admin is granted with <code className="font-mono text-xs">scripts/grant-admin.sql</code> — use this page to manage further access. Every change is audited.
      </p>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy" role="alert">{decodeURIComponent(searchParams.error)}</p>
      ) : searchParams.saved ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Roles updated.</p>
      ) : null}

      <div className="card p-6">
        <h3 className="font-serif text-lg text-charcoal">Staff access</h3>
        {staff.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Only default access" message="Grant admin/editor/support roles by searching a user's email below." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[#F5EFE3]">
            {staff.map((r) => {
              const p = profileById.get(r.user_id);
              return (
                <li key={`${r.user_id}-${r.role}`} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{p?.full_name || p?.email || r.user_id.slice(0, 8)}</span>
                    {p?.email ? <span className="ml-2 text-xs text-charcoal-muted">{p.email}</span> : null}
                  </span>
                  <Badge tone={r.role === "admin" ? "gold" : "blue"}>{r.role}</Badge>
                  <form>
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <input type="hidden" name="role" value={r.role} />
                    <button formAction={setUserRoleAction} name="mode" value="revoke" className="btn-ghost px-2 py-1 text-xs text-burgundy">Revoke</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg text-charcoal">Grant or change a role</h3>
        <form action="/admin/roles" className="mt-3 flex flex-wrap items-end gap-3" role="search">
          <div>
            <label className="label" htmlFor="rq">Find user by email or name</label>
            <input id="rq" name="q" defaultValue={q} className="input w-72" placeholder="customer@example.com" />
          </div>
          <button className="btn-burgundy px-4 py-2 text-sm">Search</button>
        </form>

        {q ? (
          searchResults.length === 0 ? (
            <p className="mt-4 text-sm italic text-charcoal-muted">No users match “{q}”. They must have signed up first.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {searchResults.map((u) => (
                <li key={u.id} className="rounded-xl border border-[#EFE7D6] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.full_name || u.email}</span>
                    <span className="text-xs text-charcoal-muted">{u.email}</span>
                    <span className="ml-auto flex gap-1">
                      {u.roles.map((r) => <Badge key={r} tone={r === "admin" ? "gold" : "gray"}>{r}</Badge>)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <form key={role} className="inline">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="role" value={role} />
                        {u.roles.includes(role) && role !== "customer" ? (
                          <button formAction={setUserRoleAction} name="mode" value="revoke" className="btn-outline px-3 py-1 text-xs text-burgundy">
                            Revoke {role}
                          </button>
                        ) : !u.roles.includes(role) ? (
                          <button formAction={setUserRoleAction} name="mode" value="grant" className="btn-ghost px-3 py-1 text-xs">
                            Grant {role}
                          </button>
                        ) : null}
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="mt-4 space-y-1 text-xs text-charcoal-muted">
            {ROLES.map((r) => <p key={r}><strong className="text-charcoal">{r}</strong> — {ROLE_HELP[r]}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
