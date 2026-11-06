import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/db/customers";
import { isEmail } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "newsletter", key: ip, limit: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  let body: { email?: string; consent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!body.consent) return NextResponse.json({ error: "Please allow us to email you to subscribe." }, { status: 400 });
  await subscribeNewsletter(email, true);
  return NextResponse.json({ ok: true });
}
