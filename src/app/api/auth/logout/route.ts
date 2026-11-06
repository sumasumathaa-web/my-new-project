import { NextResponse } from "next/server";
import { localModeEnabled } from "@/lib/local/config";
import { endLocalSession } from "@/lib/local/auth";

export const runtime = "nodejs";

export async function POST() {
  if (!localModeEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  await endLocalSession();
  return NextResponse.json({ ok: true });
}
