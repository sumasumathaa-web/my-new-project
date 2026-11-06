import { NextRequest, NextResponse } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { requestLocalPasswordReset } from "@/lib/local/auth";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { isEmail } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!localModeEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const limit = rateLimit({ scope: "local-reset", key: clientIpFromHeaders(request.headers), limit: 5, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim();
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  await requestLocalPasswordReset(email, "http://localhost:3000/auth/reset");
  // Same response whether or not the account exists.
  return NextResponse.json({ ok: true });
}
