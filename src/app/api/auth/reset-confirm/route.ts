import { NextRequest, NextResponse } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { consumeLocalResetToken } from "@/lib/local/auth";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!localModeEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const limit = rateLimit({ scope: "local-reset-confirm", key: clientIpFromHeaders(request.headers), limit: 10, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token) return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const error = await consumeLocalResetToken(token, password);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
