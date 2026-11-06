import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms and Conditions", description: "Terms and Conditions — terms" };

export default function Page() {
  return <LegalPage slug="terms" />;
}
