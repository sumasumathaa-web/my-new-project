import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Wedding Invitation Websites",
  eyebrow: "Your Own Elegant Link",
  description:
    "Single-page, multi-section, animated and photo-gallery wedding websites — customisable from your account with names, dates, venues, colours and fonts.",
  basePath: "/invitation-websites",
  kind: "website",
};

export function generateMetadata(): Metadata {
  return { title: LANDING.title, description: LANDING.description };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string; cat?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
