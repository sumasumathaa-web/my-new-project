import { NextRequest, NextResponse } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { startLocalSession } from "@/lib/local/auth";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { isEmail } from "@/lib/validation";

export const runtime = "nodejs";

/** Development-only login endpoint for the embedded database. */
export async function POST(request: NextRequest) {
  if (!localModeEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const limit = rateLimit({ scope: "local-login", key: clientIpFromHeaders(request.headers), limit: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!isEmail(email) || password.length < 1) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { error } = await startLocalSession(email, password);
  if (error) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
