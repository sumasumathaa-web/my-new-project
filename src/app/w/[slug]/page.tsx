import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCustomization } from "@/lib/db/customizations";
import { InvitationPreview } from "@/components/invitation-preview";
import { getBranding } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const invite = await getPublishedCustomization(params.slug);
  if (!invite) return { title: "Invitation" };
  const c = invite.config as Record<string, unknown>;
  const names = [c.bride_name, c.groom_name].filter(Boolean).join(" & ") || invite.title;
  return {
    title: `${names} — Wedding Invitation`,
    description: typeof c.welcome_message === "string" ? c.welcome_message.slice(0, 160) : "Wedding invitation",
    robots: { index: true },
  };
}

/** Public, shareable wedding invitation page. */
export default async function InvitePage({ params }: { params: { slug: string } }) {
  const invite = await getPublishedCustomization(params.slug);
  if (!invite) notFound();
  const branding = await getBranding();

  return (
    <div className="container-pad max-w-3xl py-10 sm:py-16">
      <InvitationPreview config={invite.config} slug={invite.slug} />
      <p className="mt-8 text-center text-xs text-charcoal-muted">
        Crafted with ♥ at {branding.businessName}
      </p>
    </div>
  );
}
