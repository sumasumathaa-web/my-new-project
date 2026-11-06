import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Engagement Invitations",
  eyebrow: "The First Announcement",
  description: "Joyful engagement invitation videos, cards and mini-sites to announce your forever.",
  basePath: "/engagement-invitations",
  categorySlug: "engagement",
};

export function generateMetadata(): Metadata {
  return { title: LANDING.title, description: LANDING.description };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
