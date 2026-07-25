import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { JsonLd, SolutionDetail } from "@/app/home/site-components";
import {
  getCanonicalSolutionSlug,
  getSolutionByAnySlug,
  solutions,
} from "@/app/home/site-data";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  serviceJsonLd,
} from "@/lib/marketing/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return solutions.flatMap((solution) => [
    { slug: solution.slug },
    ...solution.legacySlugs.map((slug) => ({ slug })),
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionByAnySlug(slug);

  if (!solution) return { title: "Solution" };

  return buildMarketingMetadata(solution.seo);
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const canonicalSlug = getCanonicalSolutionSlug(slug);

  if (!canonicalSlug) notFound();
  if (canonicalSlug !== slug) permanentRedirect(`/home/solutions/${canonicalSlug}`);

  const solution = getSolutionByAnySlug(slug);
  if (!solution) notFound();

  return (
    <>
      <JsonLd
        data={[
          serviceJsonLd({
            name: `${solution.title} software`,
            description: solution.seo.description,
            path: solution.seo.path,
            serviceType: solution.title,
            keywords: solution.seo.keywords,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Solutions", path: "/home/solutions" },
            { name: solution.title, path: solution.seo.path },
          ]),
        ]}
      />
      <SolutionDetail solution={solution} />
    </>
  );
}
