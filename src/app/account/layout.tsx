import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account/customizations", label: "My Customizations" },
  { href: "/account/favorites", label: "Favorites" },
  { href: "/account/support", label: "Support" },
];

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-pad py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="card p-5">
            <p className="font-serif text-lg text-charcoal">{(user.user_metadata?.full_name as string) || "My account"}</p>
            <p className="truncate text-xs text-charcoal-muted">{user.email}</p>
            <nav className="mt-4 space-y-1" aria-label="Account">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="block rounded-lg px-3 py-2 text-sm text-charcoal-soft transition hover:bg-champagne"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t border-[#EFE7D6] pt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
