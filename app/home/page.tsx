import type { Metadata } from "next";

import { HomeMarketingPage } from "@/app/home/home-content";
import { seoPages } from "@/app/home/site-data";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.home);

export default function HomePage() {
  return <HomeMarketingPage />;
}
