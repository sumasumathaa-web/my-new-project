import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTicketWithMessages } from "@/lib/db/customers";
import { replyTicketAction } from "../../actions";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket", robots: { index: false } };

export default async function TicketPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/account/support/${params.id}`);
  const data = await getTicketWithMessages(params.id);
  if (!data) notFound();
  if (data.ticket.user_id !== user.id) redirect("/account/support");
  const { ticket, messages } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-2xl text-charcoal">{ticket.subject}</h1>
        <Badge tone={ticket.status === "open" ? "amber" : ticket.status === "in_progress" ? "blue" : "green"}>
          {ticket.status.replace("_", " ")}
        </Badge>
      </div>
      <div className="space-y-3">
        {messages.map((m: any) => (
          <div
            key={m.id}
            className={`card max-w-2xl p-4 ${m.author_role === "admin" ? "ml-auto border-[#E3D2C6]" : ""}`}
          >
            <p className="text-xs uppercase tracking-wide text-charcoal-muted">
              {m.author_role === "admin" ? "Studio" : "You"} ·{" "}
              {new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-charcoal-soft">{m.body}</p>
          </div>
        ))}
      </div>
      <form action={replyTicketAction} className="card space-y-3 p-5">
        <input type="hidden" name="ticket_id" value={ticket.id} />
        <label htmlFor="reply" className="label">Reply</label>
        <textarea id="reply" name="message" rows={3} maxLength={4000} required className="input" />
        <button type="submit" className="btn-gold">Send reply</button>
      </form>
      <Link href="/account/support" className="btn-ghost text-sm">← All tickets</Link>
    </div>
  );
}
