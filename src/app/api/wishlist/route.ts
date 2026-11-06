import { NextResponse } from "next/server";
import { getApiAuth } from "@/lib/auth";
import { toggleWishlist, listWishlistProducts } from "@/lib/db/customers";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Login required." }, { status: 401 });
  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.productId || !isUuid(body.productId)) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  }
  const added = await toggleWishlist(auth.user.id, body.productId);
  return NextResponse.json({ added });
}

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const items = await listWishlistProducts(auth.user.id);
  return NextResponse.json({ items });
}
