import Link from "next/link";
import { getBranding, getHomepage } from "@/lib/settings";

export async function SiteFooter() {
  const [branding, homepage] = await Promise.all([getBranding(), getHomepage()]);
  const year = new Date().getFullYear();
  const socials = [
    { label: "Instagram", url: branding.instagram },
    { label: "Facebook", url: branding.facebook },
    { label: "YouTube", url: branding.youtube },
    { label: "Twitter / X", url: branding.twitter },
  ].filter((s) => s.url);

  return (
    <footer className="mt-16 border-t border-[#E8DFCE] bg-[#241F1B] text-[#EDE4D2]">
      <div className="container-pad grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-xl" style={{ color: "var(--brand-gold)" }}>
            {branding.businessName}
          </p>
          <p className="mt-3 text-sm text-[#C9BBA3]">{homepage.footerText}</p>
          {socials.length ? (
            <ul className="mt-4 flex gap-4 text-xs uppercase tracking-widest">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-[#F3EAD9]">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Shop">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#B08D57]">Shop</h3>
          <ul className="space-y-2 text-sm text-[#C9BBA3]">
            <li><Link href="/invitation-videos" className="hover:text-white">Invitation Videos</Link></li>
            <li><Link href="/invitation-websites" className="hover:text-white">Wedding Websites</Link></li>
            <li><Link href="/digital-cards" className="hover:text-white">Digital Cards</Link></li>
            <li><Link href="/themes" className="hover:text-white">Themes</Link></li>
            <li><Link href="/custom-design" className="hover:text-white">Custom Design</Link></li>
            <li><Link href="/offers" className="hover:text-white">Offers</Link></li>
          </ul>
        </nav>
        <nav aria-label="Support">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#B08D57]">Support</h3>
          <ul className="space-y-2 text-sm text-[#C9BBA3]">
            <li><Link href="/faqs" className="hover:text-white">FAQs</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">Track Order</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#B08D57]">Legal</h3>
          <ul className="space-y-2 text-sm text-[#C9BBA3]">
            <li><Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/refund-policy" className="hover:text-white">Refund &amp; Cancellation</Link></li>
            <li><Link href="/license" className="hover:text-white">Digital License</Link></li>
            <li><Link href="/delivery-policy" className="hover:text-white">Delivery &amp; Revisions</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-pad flex flex-col items-center justify-between gap-3 py-5 text-xs text-[#9B8F7C] sm:flex-row">
          <p>© {year} {branding.businessName}. All rights reserved.</p>
          <p>
            {branding.email ? <span className="mr-4">{branding.email}</span> : null}
            {branding.phone ? <span>{branding.phone}</span> : null}
          </p>
        </div>
      </div>
    </footer>
  );
}
