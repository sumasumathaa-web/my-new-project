import { NextResponse } from "next/server";
import { getPublishedCustomization } from "@/lib/db/customizations";
import { safeServiceSupabase } from "@/lib/supabase/admin";
import { requireString, sanitizeText, requireEnum, toInt, ValidationError } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "rsvp", key: ip, limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Slow down." }, { status: 429 });

  let body: { slug?: string; name?: string; attending?: string; guests?: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const slug = requireString(body.slug, "Invitation", { max: 160 });
    const name = sanitizeText(requireString(body.name, "Name", { max: 120 }));
    const attending = requireEnum(body.attending, ["yes", "no", "maybe"] as const, "Attending");
    const guests = toInt(body.guests ?? 1, "Guests", { min: 1, max: 10 });
    const message = body.message ? sanitizeText(String(body.message)).slice(0, 500) : null;

    const invite = await getPublishedCustomization(slug);
    if (!invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    const sb = safeServiceSupabase();
    if (!sb) return NextResponse.json({ error: "DB unavailable." }, { status: 500 });
    const { error } = await sb.from("rsvp_responses").insert({
      customization_id: invite.id,
      guest_name: name,
      attending,
      guests,
      message,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save your RSVP." }, { status: 500 });
  }
}
