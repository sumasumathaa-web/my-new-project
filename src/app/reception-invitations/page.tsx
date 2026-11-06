import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Reception Invitations",
  eyebrow: "Celebrate Together",
  description: "Elegant invitations for the reception celebration — videos, websites and digital cards.",
  basePath: "/reception-invitations",
  categorySlug: "reception",
};

export function generateMetadata(): Metadata {
  return { title: LANDING.title, description: LANDING.description };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
