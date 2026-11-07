import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/settings";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const branding = await getBranding();

  return (
    <div className="paper min-h-screen">
      <div className="border-b border-[#E8DFCE] bg-cream/80 backdrop-blur">
        <div className="container-pad flex h-14 items-center gap-3">
          <Link href="/admin" className="font-serif text-base text-charcoal">
            {branding.businessName}
          </Link>
          <span className="badge-red">admin</span>
          <div className="ml-auto flex items-center gap-3 text-xs text-charcoal-muted">
            <Link href="/" className="link-underline hidden sm:inline">
              View storefront →
            </Link>
            <span className="hidden h-4 w-px bg-[#E0D5C0] sm:block" />
            <span className="truncate">{user.email ?? "admin"}</span>
          </div>
        </div>
      </div>

      <div className="container-pad grid gap-6 py-6 lg:grid-cols-[252px_1fr]">
        <AdminNav email={user.email ?? "admin"} businessName={branding.businessName} />
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
