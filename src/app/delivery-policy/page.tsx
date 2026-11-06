import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Delivery and Revision Policy", description: "Delivery and Revision Policy — delivery-policy" };

export default function Page() {
  return <LegalPage slug="delivery-policy" />;
}
