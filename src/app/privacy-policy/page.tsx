import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy", description: "Privacy Policy — privacy-policy" };

export default function Page() {
  return <LegalPage slug="privacy-policy" />;
}
