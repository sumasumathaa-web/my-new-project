/**
 * Configurable transactional email.
 *
 * Providers (env EMAIL_PROVIDER):
 *   - "log" (default): records the email in the audit log — no external setup.
 *   - "resend"   : https://resend.com    (RESEND_API_KEY)
 *   - "postmark" : https://postmarkapp.com (POSTMARK_SERVER_TOKEN)
 *   - "sendgrid" : https://sendgrid.com  (SENDGRID_API_KEY)
 *
 * EMAIL_FROM controls sender identity. Email failures NEVER break checkout or
 * order flows — they are logged and returned.
 */
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<{ sent: boolean; error?: string }> {
  const provider = env.emailProvider;
  try {
    if (provider === "resend" && env.resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.emailFrom, to: msg.to, subject: msg.subject, html: msg.html }),
      });
      if (!res.ok) throw new Error(`Resend error ${res.status}`);
      return { sent: true };
    }
    if (provider === "postmark" && env.postmarkToken) {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": env.postmarkToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: env.emailFrom,
          To: msg.to,
          Subject: msg.subject,
          HtmlBody: msg.html,
          TextBody: msg.text ?? "",
        }),
      });
      if (!res.ok) throw new Error(`Postmark error ${res.status}`);
      return { sent: true };
    }
    if (provider === "sendgrid" && env.sendgridApiKey) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.sendgridApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: env.emailFrom.replace(/.*<([^>]+)>.*/, "$1") },
          subject: msg.subject,
          content: [{ type: "text/html", value: msg.html }],
        }),
      });
      if (!res.ok) throw new Error(`SendGrid error ${res.status}`);
      return { sent: true };
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : "Email provider failure";
    await logAudit({
      action: "email.failed",
      entity: "email",
      meta: { to: msg.to, subject: msg.subject, provider, error },
    });
    return { sent: false, error };
  }

  // Fallback: record to audit log so nothing is silently dropped.
  await logAudit({
    action: "email.logged",
    entity: "email",
    meta: { to: msg.to, subject: msg.subject, provider: "log" },
  });
  return { sent: false, error: "Email provider not configured; message recorded in audit log." };
}

/* ---------------------------- Templates ---------------------------- */

export function brandedEmail(opts: {
  businessName: string;
  accentColor: string;
  heading: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF7F1;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#2B2622;">
  <div style="max-width:560px;margin:0 auto;background:#FFFDF8;border:1px solid #E8DFCE;border-radius:12px;overflow:hidden;">
    <div style="background:${opts.accentColor};color:#FFFDF8;padding:20px 28px;">
      <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.08em;">${escapeHtml(opts.businessName)}</div>
    </div>
    <div style="padding:28px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#2B2622;">${escapeHtml(opts.heading)}</h1>
      ${opts.bodyHtml}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #EFE7D6;font-size:12px;color:#7A7066;">
      ${opts.footerNote ? escapeHtml(opts.footerNote) : "This is an automated message. Please do not reply."}
    </div>
  </div></body></html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function moneyRow(label: string, value: string, strong = false): string {
  return `<tr><td style="padding:6px 0;color:#4A423B;">${escapeHtml(label)}</td>
  <td style="padding:6px 0;text-align:right;${strong ? "font-weight:700;color:#6E1E2C;" : "color:#2B2622;"}">${escapeHtml(value)}</td></tr>`;
}
