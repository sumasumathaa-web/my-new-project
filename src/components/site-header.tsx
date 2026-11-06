import Link from "next/link";
import { getSessionUser, isAdminId } from "@/lib/auth";
import { getBranding, getHomepage } from "@/lib/settings";
import { listActiveBanners } from "@/lib/db/catalog";
import { CartBadge } from "@/components/cart-buttons";
import { MobileNav } from "@/components/mobile-nav";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/invitation-videos", label: "Videos" },
  { href: "/invitation-websites", label: "Websites" },
  { href: "/digital-cards", label: "Cards" },
  { href: "/themes", label: "Themes" },
  { href: "/quotes", label: "Quotes" },
  { href: "/offers", label: "Offers" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const [branding, homepage, user, announcementBanners] = await Promise.all([
    getBranding(),
    getHomepage(),
    getSessionUser(),
    listActiveBanners("announcement"),
  ]);
  const isAdmin = await isAdminId(user?.id);
  const announcement = announcementBanners[0];

  return (
    <header className="sticky top-0 z-40 border-b border-[#E8DFCE] bg-ivory/95 backdrop-blur">
      {homepage.announcementEnabled && homepage.announcement ? (
        <div
          className="px-4 py-2 text-center text-xs tracking-wide text-cream"
          style={{ backgroundColor: "var(--brand-accent)" }}
        >
          {homepage.announcementUrl ? (
            <Link href={homepage.announcementUrl} className="hover:underline">
              {homepage.announcement}
            </Link>
          ) : (
            homepage.announcement
          )}
        </div>
      ) : announcement ? (
        <div className="px-4 py-2 text-center text-xs tracking-wide text-cream" style={{ backgroundColor: "var(--brand-accent)" }}>
          <Link href={announcement.cta_url ?? "/offers"} className="hover:underline">
            {announcement.title}
          </Link>
        </div>
      ) : null}

      <div className="container-pad flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2" aria-label={`${branding.businessName} home`}>
          <span className="font-serif text-xl tracking-wide" style={{ color: "var(--brand-accent)" }}>
            {branding.businessName}
          </span>
          {branding.tagline ? (
            <span className="hidden text-[11px] uppercase tracking-widest text-charcoal-muted md:inline">
              {branding.tagline}
            </span>
          ) : null}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="link-underline text-sm">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-sm">
          <form action="/search" className="hidden md:block" role="search">
            <input
              type="search"
              name="q"
              placeholder="Search invitations…"
              aria-label="Search invitations"
              className="input h-9 w-44 rounded-full px-4 text-xs"
            />
          </form>
          <CartBadge />
          {user ? (
            <>
              <Link href="/account" className="link-underline hidden sm:inline">
                Account
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="link-underline hidden font-semibold text-burgundy sm:inline">
                  Admin
                </Link>
              ) : null}
            </>
          ) : (
            <Link href="/login" className="link-underline hidden sm:inline">
              Login
            </Link>
          )}
          <MobileNav nav={NAV} isLoggedIn={Boolean(user)} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
