import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Digital Wedding Cards",
  eyebrow: "Shareable in Seconds",
  description:
    "Traditional, floral, royal and minimalist digital cards — high-resolution PNG + PDF, personalised and ready for WhatsApp.",
  basePath: "/digital-cards",
  kind: "card",
};

export function generateMetadata(): Metadata {
  return { title: LANDING.title, description: LANDING.description };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string; cat?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
