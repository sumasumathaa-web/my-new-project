import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listOrdersAdmin } from "@/lib/db/orders";

export const dynamic = "force-dynamic";

function esc(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of the currently filtered order list (admin only, max 2000 rows). */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const q = url.searchParams.get("q") ?? "";
  const { items } = await listOrdersAdmin({ status, q, page: 1, pageSize: 2000 });

  const header = ["order_number", "placed_at", "email", "phone", "status", "payment_status", "subtotal", "discount", "tax", "grand_total", "coupon", "items"];
  const rows = items.map((o) => [
    o.order_number,
    o.placed_at,
    o.email,
    o.phone,
    o.status,
    o.payment_status,
    o.subtotal,
    o.discount_total,
    o.tax_total,
    o.grand_total,
    o.coupon_code,
    (o.items ?? []).map((i) => `${i.product_name} x${i.quantity}`).join("; "),
  ]);

  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
