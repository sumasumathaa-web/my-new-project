import type { Metadata } from "next";
import { renderCategoryLanding, type CategoryLandingProps } from "@/components/category-landing";

export const dynamic = "force-dynamic";

const LANDING: CategoryLandingProps = {
  title: "Wedding Invitation Videos",
  eyebrow: "Cinematic & Traditional",
  description:
    "Handcrafted invitation films — Tamil traditional, royal, floral, cinematic, Nikah and Christian styles. Personalised and share-ready.",
  basePath: "/invitation-videos",
  kind: "video",
};

export function generateMetadata(): Metadata {
  return {
    title: LANDING.title,
    description: LANDING.description,
    openGraph: { title: LANDING.title, description: LANDING.description },
  };
}

export default function Page({ searchParams }: { searchParams: { page?: string; sort?: string; cat?: string } }) {
  return renderCategoryLanding(LANDING, searchParams);
}
