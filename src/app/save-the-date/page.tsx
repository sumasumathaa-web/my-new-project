import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Save the Date",
  eyebrow: "Mark the Calendar",
  description: "Short, shareable save-the-date videos and cards your guests will love.",
  basePath: "/save-the-date",
  categorySlug: "save-the-date",
};

export function generateMetadata(): Metadata {
  return { title: LANDING.title, description: LANDING.description };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
