import { permanentRedirect } from "next/navigation";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const legacyProductMap: Record<string, string> = {
  "retail-wholesale": "commerce",
  automotive: "workshops-auto",
  schools: "schools",
};

export function generateStaticParams() {
  return Object.keys(legacyProductMap).map((slug) => ({ slug }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  permanentRedirect(`/home/solutions/${legacyProductMap[slug] ?? slug}`);
}
