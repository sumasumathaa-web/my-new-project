import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Refund and Cancellation Policy", description: "Refund and Cancellation Policy — refund-policy" };

export default function Page() {
  return <LegalPage slug="refund-policy" />;
}
