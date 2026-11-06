import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Digital Product License", description: "Digital Product License — license" };

export default function Page() {
  return <LegalPage slug="license" />;
}
