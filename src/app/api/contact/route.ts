import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createTicket } from "@/lib/db/customers";
import { getBranding } from "@/lib/settings";
import { sendEmail, brandedEmail, escapeHtml } from "@/lib/email";
import { requireString, sanitizeText } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const rl = rateLimit({ scope: "contact", key: ip, limit: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many messages. Try later." }, { status: 429 });

  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const name = sanitizeText(requireString(body.name, "Name", { max: 120 }));
    const subject = sanitizeText(requireString(body.subject, "Subject", { max: 160 }));
    const message = sanitizeText(requireString(body.message, "Message", { max: 4000 }));

    const user = await getSessionUser();
    if (user) {
      // Logged-in visitors get a real support ticket they can track.
      const id = await createTicket(
        user.id,
        `${subject} — from ${name}`,
        `From: ${name} <${body.email ?? user.email ?? ""}>\n\n${message}`,
      );
      return NextResponse.json({ ok: true, ticketId: id, ticket: true });
    }

    // Guests: forward to the business inbox (or audit-log when unconfigured).
    const branding = await getBranding();
    const to = branding.email || "no-reply@example.com";
    await sendEmail({
      to,
      subject: `Contact form: ${subject}`,
      html: brandedEmail({
        businessName: branding.businessName,
        accentColor: branding.accentColor,
        heading: "New contact message",
        bodyHtml: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(body.email ?? "no email")})</p>
          <p style="white-space:pre-line;color:#4A423B;">${escapeHtml(message)}</p>`,
      }),
    });
    return NextResponse.json({ ok: true, ticket: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not send." }, { status: 400 });
  }
}
