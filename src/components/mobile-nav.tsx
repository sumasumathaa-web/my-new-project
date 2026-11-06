"use client";

import React from "react";
import Link from "next/link";

export function MobileNav(props: {
  nav: { href: string; label: string }[];
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E0D5C0] bg-cream"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
          {open ? (
            <path d="M2 2 L16 12 M16 2 L2 12" stroke="#2B2622" strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M1 1.5 H17 M1 7 H17 M1 12.5 H17" stroke="#2B2622" strokeWidth="1.6" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open ? (
        <nav
          aria-label="Mobile"
          className="absolute left-0 right-0 top-full border-b border-[#E8DFCE] bg-ivory shadow-soft"
        >
          <ul className="container-pad grid gap-1 py-4">
            {props.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-charcoal-soft hover:bg-champagne"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={props.isLoggedIn ? "/account" : "/login"}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-burgundy hover:bg-champagne"
                onClick={() => setOpen(false)}
              >
                {props.isLoggedIn ? "My Account" : "Login / Register"}
              </Link>
            </li>
            {props.isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-burgundy hover:bg-champagne"
                  onClick={() => setOpen(false)}
                >
                  Admin Dashboard
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
