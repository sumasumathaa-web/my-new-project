import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUserCustomizations } from "@/lib/db/customizations";
import { Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Customizations", robots: { index: false } };

export default async function CustomizationsPage() {
  const user = await requireUser("/account/customizations");
  const items = await listUserCustomizations(user.id);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-charcoal">My customizations</h1>
        <Link href="/account/customizations/new" className="btn-gold">New invitation draft</Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No drafts yet"
            message="Start personalising a wedding website or card template."
            action={<Link href="/invitation-websites" className="btn-gold">Choose a template</Link>}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/account/customizations/${c.id}`} className="card flex flex-wrap items-center gap-3 p-4 transition hover:shadow-soft">
                <div>
                  <p className="font-medium text-charcoal">{c.title}</p>
                  <p className="text-xs text-charcoal-muted">
                    {c.product_name ?? "Custom"} · v{c.version} · edited{" "}
                    {new Date(c.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone={c.status === "published" ? "green" : c.status === "archived" ? "gray" : "amber"}>{c.status}</Badge>
                  {c.status === "published" ? (
                    <span className="text-xs text-charcoal-muted">/w/{c.slug}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
