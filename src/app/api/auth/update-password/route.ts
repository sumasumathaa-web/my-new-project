import { NextRequest, NextResponse } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { updateLocalPassword } from "@/lib/local/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!localModeEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = String(body.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const error = await updateLocalPassword(password);
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ ok: true });
}
