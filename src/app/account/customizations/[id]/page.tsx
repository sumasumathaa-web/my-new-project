import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserCustomization, listRevisions } from "@/lib/db/customizations";
import { getProductById } from "@/lib/db/catalog";
import { listRsvps } from "@/lib/db/customizations-extra";
import { DEFAULT_INVITE_SCHEMA } from "@/lib/customization-schema";
import { CustomizationEditor } from "@/components/customization-editor";
import { effectivePriceRupees } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation editor", robots: { index: false } };

export default async function EditorPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/account/customizations/${params.id}`);
  const customization = await getUserCustomization(params.id, user.id);
  if (!customization) notFound();
  const product = customization.product_id ? await getProductById(customization.product_id, true) : null;
  const schema = product?.customization_schema?.length ? product.customization_schema : DEFAULT_INVITE_SCHEMA;
  const revisions = await listRevisions(customization.id, user.id);
  const rsvps = customization.status === "published" ? await listRsvps(customization.id) : [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/account/customizations" className="btn-ghost px-2 py-1 text-sm">← My customizations</Link>
        <h1 className="font-serif text-2xl text-charcoal">{customization.product_name ?? "Invitation"}</h1>
      </div>

      <CustomizationEditor
        id={customization.id}
        initialTitle={customization.title}
        initialConfig={customization.config}
        schema={schema}
        status={customization.status}
        version={customization.version}
        slug={customization.slug}
        revisions={revisions as { version: number; created_at: string }[]}
        publishPrice={product ? effectivePriceRupees(product) : null}
      />

      {customization.status === "published" ? (
        <section className="card mt-10 p-6">
          <h2 className="font-serif text-xl text-charcoal">RSVP responses ({rsvps.length})</h2>
          {rsvps.length === 0 ? (
            <p className="mt-2 text-sm text-charcoal-muted">No responses yet. Share your link to collect RSVPs.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#EFE7D6] text-sm">
              {rsvps.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="font-medium">{r.guest_name}</span>
                  <span className={r.attending === "yes" ? "text-[#2F6B38]" : r.attending === "no" ? "text-burgundy" : "text-amber-700"}>
                    {r.attending}
                  </span>
                  <span className="text-charcoal-muted">· {r.guests} guest{r.guests === 1 ? "" : "s"}</span>
                  {r.message ? <span className="w-full text-xs text-charcoal-muted">“{r.message}”</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
