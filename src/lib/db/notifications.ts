/** Transactional emails — sent only after verified server-side state changes. */
import { getOrderById } from "@/lib/db/orders";
import { getBranding } from "@/lib/settings";
import { brandedEmail, moneyRow, sendEmail, escapeHtml } from "@/lib/email";
import { formatINR } from "@/lib/money";

export async function sendOrderPaidEmail(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) return;
  const branding = await getBranding();
  const customer = (order.customer ?? {}) as { name?: string };
  const items = order.items ?? [];
  const rows = items
    .map((i) => `<tr><td style="padding:6px 0;color:#4A423B;">${escapeHtml(i.product_name)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right;">${escapeHtml(formatINR(Number(i.total)))}</td></tr>`)
    .join("");
  const html = brandedEmail({
    businessName: branding.businessName,
    accentColor: branding.accentColor,
    heading: `Order ${order.order_number} confirmed`,
    bodyHtml: `
      <p style="color:#4A423B;">Dear ${escapeHtml(customer.name ?? "Customer")},</p>
      <p style="color:#4A423B;">Your payment was received and your order is confirmed. You can track it anytime from your account.</p>
      <table style="width:100%;margin:16px 0;border-collapse:collapse;">
        ${rows}
        ${moneyRow("Subtotal", formatINR(Number(order.subtotal)))}
        ${Number(order.discount_total) > 0 ? moneyRow("Discount", `−${formatINR(Number(order.discount_total))}`) : ""}
        ${Number(order.tax_total) > 0 ? moneyRow("Tax", formatINR(Number(order.tax_total))) : ""}
        ${moneyRow("Total paid", formatINR(Number(order.grand_total)), true)}
      </table>
      <p style="font-size:12px;color:#7A7066;">Next: if your product is customisable, open “My Customizations” in your account to share your wedding details.</p>`,
  });
  await sendEmail({ to: order.email, subject: `${branding.businessName}: order ${order.order_number} confirmed`, html });
}

export async function sendOrderStatusEmail(orderId: string, statusLabel: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) return;
  const branding = await getBranding();
  const html = brandedEmail({
    businessName: branding.businessName,
    accentColor: branding.accentColor,
    heading: `Update on order ${order.order_number}`,
    bodyHtml: `<p style="color:#4A423B;">Your order status is now <strong>${escapeHtml(statusLabel)}</strong>.</p>
      ${order.notes_customer ? `<p style="color:#4A423B;">Note from the team: ${escapeHtml(order.notes_customer)}</p>` : ""}
      <p style="font-size:12px;color:#7A7066;">Sign in to your account for full details and downloads.</p>`,
  });
  await sendEmail({ to: order.email, subject: `${branding.businessName}: order ${order.order_number} — ${statusLabel}`, html });
}
