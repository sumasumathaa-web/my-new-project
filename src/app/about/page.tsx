import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About Us", description: "About Us — about" };

export default function Page() {
  return <LegalPage slug="about" />;
}
