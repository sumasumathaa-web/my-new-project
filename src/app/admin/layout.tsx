import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/themes", label: "Themes" },
  { href: "/admin/content", label: "Quotes & Content" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/offers", label: "Offers & Coupons" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/homepage", label: "Homepage Editor" },
  { href: "/admin/customer-websites", label: "Customer Websites" },
  { href: "/admin/support", label: "Support Requests" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Branding & Settings" },
  { href: "/admin/roles", label: "User Roles" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="container-pad py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl text-charcoal">Admin dashboard</h1>
        <span className="badge-red">admin</span>
        <span className="text-xs text-charcoal-muted">{user.email}</span>
        <Link href="/" className="ml-auto text-xs text-charcoal-muted underline">View storefront →</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <nav className="card p-3" aria-label="Admin sections">
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="block rounded-lg px-3 py-2 text-sm text-charcoal-soft transition hover:bg-champagne"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
