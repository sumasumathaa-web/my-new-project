"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: string };
type Group = { title: string; items: Item[] };

export const ADMIN_GROUPS: Group[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/themes", label: "Themes" },
      { href: "/admin/content", label: "Quotes & Content" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/offers", label: "Offers & Coupons" },
      { href: "/admin/reports", label: "Reports" },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/homepage", label: "Homepage Editor" },
      { href: "/admin/settings", label: "Branding & Settings" },
      { href: "/admin/media", label: "Media Library" },
      { href: "/admin/customer-websites", label: "Customer Websites" },
    ],
  },
  { title: "Customers", items: [{ href: "/admin/support", label: "Support Requests" }] },
  {
    title: "System",
    items: [
      { href: "/admin/status", label: "System Status" },
      { href: "/admin/roles", label: "User Roles" },
      { href: "/admin/audit-logs", label: "Audit Logs" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ email, businessName }: { email: string; businessName: string }) {
  const pathname = usePathname() ?? "/admin";
  const current = ADMIN_GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));

  return (
    <>
      {/* Mobile: collapsible */}
      <details className="card mb-4 p-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-1 text-sm font-semibold text-charcoal">
          <span>{current?.label ?? "Admin menu"}</span>
          <span aria-hidden className="text-gold">☰</span>
        </summary>
        <div className="mt-3 space-y-3 border-t border-[#E8DFCE] pt-3">
          {ADMIN_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                {group.title}
              </p>
              <ul className="grid grid-cols-2 gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={`admin-link ${isActive(pathname, item.href) ? "admin-link-active" : ""}`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="card p-4">
          <div className="mb-4 border-b border-[#E8DFCE] pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest2 text-gold">Signed in as admin</p>
            <p className="mt-1 truncate font-serif text-lg leading-tight text-charcoal">{businessName}</p>
            <p className="truncate text-[11px] text-charcoal-muted">{email}</p>
          </div>
          <nav aria-label="Admin sections" className="space-y-4">
            {ADMIN_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={`admin-link ${isActive(pathname, item.href) ? "admin-link-active" : ""}`}>
                        <span aria-hidden className="text-[9px] text-gold/70">◆</span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-4 border-t border-[#E8DFCE] pt-3">
            <Link href="/" className="admin-link">
              <span aria-hidden className="text-[9px] text-gold/70">◆</span>
              View storefront
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
