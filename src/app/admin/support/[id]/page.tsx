import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketWithMessages } from "@/lib/db/customers";
import { adminReplyTicketAction, adminSetTicketStatusAction } from "../../actions-orders";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

interface MessageRow {
  id: string;
  author_user_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
}

export default async function AdminTicketThreadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sent?: string; saved?: string };
}) {
  const data = await getTicketWithMessages(params.id);
  if (!data) notFound();
  const { ticket, messages } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/support" className="btn-ghost px-2 py-1 text-sm">← Inbox</Link>
        <h2 className="font-serif text-2xl text-charcoal">{ticket.subject}</h2>
        <Badge tone={ticket.status === "open" ? "amber" : ticket.status === "in_progress" ? "blue" : ticket.status === "resolved" ? "green" : "gray"}>
          {String(ticket.status).replace(/_/g, " ")}
        </Badge>
      </div>
      {searchParams.sent ? <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Reply sent — ticket moved to in-progress.</p> : null}
      {searchParams.saved ? <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Status updated.</p> : null}
      <p className="text-xs text-charcoal-muted">
        Ticket {ticket.id} · opened {new Date(ticket.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      <div className="space-y-3">
        {(messages as MessageRow[]).map((m) => (
          <div key={m.id} className={`card p-4 ${m.author_role === "admin" ? "border-l-4 border-l-burgundy" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
              {m.author_role === "admin" ? "Support reply" : "Customer"} · {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
          </div>
        ))}
      </div>

      <form action={adminReplyTicketAction} className="card space-y-3 p-5">
        <input type="hidden" name="id" value={ticket.id} />
        <label className="label" htmlFor="message">Reply to customer</label>
        <textarea id="message" name="message" required rows={4} maxLength={4000} className="input" placeholder="Type your reply…" />
        <button className="btn-burgundy px-5 py-2 text-sm">Send reply</button>
      </form>

      <form action={adminSetTicketStatusAction} className="card flex flex-wrap items-end gap-3 p-5">
        <input type="hidden" name="id" value={ticket.id} />
        <div>
          <label className="label" htmlFor="tstatus">Ticket status</label>
          <select id="tstatus" name="status" defaultValue={ticket.status} className="input w-44">
            {["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <button className="btn-outline px-4 py-2 text-sm">Update status</button>
      </form>
    </div>
  );
}
