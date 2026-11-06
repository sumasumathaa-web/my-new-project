import Link from "next/link";
import { listTickets, type TicketRow } from "@/lib/db/customers";
import { Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["all", "open", "in_progress", "resolved", "closed"] as const;

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: { status?: string; saved?: string; error?: string };
}) {
  const { items } = await listTickets({});
  const filter = STATUS_TABS.includes(searchParams.status as (typeof STATUS_TABS)[number]) ? searchParams.status! : "all";
  const tickets = filter === "all" ? items : items.filter((t: TicketRow) => t.status === filter);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl text-charcoal">Support inbox</h2>
      <nav className="flex flex-wrap gap-2" aria-label="Status filter">
        {STATUS_TABS.map((s) => (
          <a key={s} href={`/admin/support?status=${s}`} className={`rounded-full px-4 py-1.5 text-sm capitalize ${filter === s ? "bg-burgundy text-cream" : "bg-champagne text-charcoal-soft"}`}>
            {s.replace(/_/g, " ")}
          </a>
        ))}
      </nav>
      {searchParams.error ? (
        <p className="rounded-xl bg-[#F6E2E4] px-4 py-3 text-sm text-burgundy">{decodeURIComponent(searchParams.error)}</p>
      ) : null}

      {tickets.length === 0 ? (
        <EmptyState title="No tickets" message="Support requests from customers appear here." />
      ) : (
        <ul className="space-y-3">
          {tickets.map((t: TicketRow) => (
            <li key={t.id} className="card flex flex-wrap items-center gap-3 p-4">
              <Link href={`/admin/support/${t.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-charcoal hover:text-burgundy">{t.subject}</p>
                <p className="text-xs text-charcoal-muted">
                  {t.user_email ?? t.user_id} · opened {new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </Link>
              <Badge tone={t.status === "open" ? "amber" : t.status === "in_progress" ? "blue" : t.status === "resolved" ? "green" : "gray"}>
                {t.status.replace(/_/g, " ")}
              </Badge>
              <Link href={`/admin/support/${t.id}`} className="btn-outline px-3 py-1.5 text-xs">Open thread</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
