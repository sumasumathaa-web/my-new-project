import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session cookie.
 *
 * Performance: this runs on every matched request, and `getUser()` is a network
 * round-trip to Supabase. Anonymous storefront traffic almost never carries an
 * auth cookie, so we skip the round-trip entirely when there is nothing to
 * refresh — that removes ~150-400 ms of latency from every public page view.
 * Route *authorization* is still enforced in layouts/route handlers.
 */
const AUTH_COOKIE_RE = /^sb-[\w-]+-auth-token(\.\d+)?$/;

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => AUTH_COOKIE_RE.test(c.name));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request });

  // Nothing to refresh for anonymous visitors.
  if (!hasAuthCookie(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
  // Refresh the token only when it is close to expiring.
  await supabase.auth.getSession();
  return response;
}

export const config = {
  // Only routes that actually depend on a session. Public marketing pages,
  // image/media routes and API endpoints that authenticate themselves are skipped.
  matcher: ["/admin/:path*", "/account/:path*", "/checkout", "/login", "/register", "/w/:path*"],
};
