import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTickets } from "@/lib/db/customers";
import { createTicketAction } from "../actions";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support", robots: { index: false } };

export default async function SupportPage({ searchParams }: { searchParams: { created?: string; error?: string } }) {
  const user = await requireUser("/account/support");
  const { items: tickets } = await listTickets({ userId: user.id });

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-charcoal">Support</h1>
      {searchParams.created ? (
        <p className="rounded-xl bg-[#E4EFE3] px-4 py-3 text-sm text-[#2F6B38]">Ticket created — we reply here.</p>
      ) : null}

      <form action={createTicketAction} className="card space-y-4 p-6">
        <h2 className="font-serif text-xl text-charcoal">New request</h2>
        <div>
          <label htmlFor="subject" className="label">Subject</label>
          <input id="subject" name="subject" required maxLength={160} className="input" />
        </div>
        <div>
          <label htmlFor="message" className="label">How can we help?</label>
          <textarea id="message" name="message" required rows={4} maxLength={4000} className="input" />
        </div>
        {searchParams.error ? <p className="text-sm text-burgundy">Could not create the request. Please try again.</p> : null}
        <button type="submit" className="btn-burgundy">Create ticket</button>
      </form>

      <div>
        <h2 className="mb-4 font-serif text-xl text-charcoal">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-charcoal-muted">No support requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/account/support/${t.id}`} className="card flex items-center gap-3 p-4 transition hover:shadow-soft">
                  <span className="font-medium text-charcoal">{t.subject}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <Badge tone={t.status === "open" ? "amber" : t.status === "in_progress" ? "blue" : "green"}>
                      {t.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-charcoal-muted">
                      {new Date(t.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
