import type { MetadataRoute } from "next";

import { solutionPages } from "@/components/marketing/marketing-data";
import { PRODUCT_COMMERCIALS } from "@/lib/marketing/pricing";
import { absoluteUrl } from "@/lib/marketing/seo";

/**
 * Public marketing surface only. Authenticated app routes are intentionally
 * excluded — they are behind auth and must never appear in the index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/home", priority: 1, changeFrequency: "weekly" },
    { path: "/home/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/home/pricing/schools", priority: 0.8, changeFrequency: "monthly" },
    { path: "/home/products", priority: 0.9, changeFrequency: "weekly" },
    { path: "/home/solutions", priority: 0.8, changeFrequency: "monthly" },
    { path: "/home/product", priority: 0.7, changeFrequency: "monthly" },
    { path: "/home/book-demo", priority: 0.9, changeFrequency: "monthly" },
    { path: "/home/about", priority: 0.5, changeFrequency: "yearly" },
    { path: "/home/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/home/faq", priority: 0.6, changeFrequency: "monthly" },
  ];

  const productRoutes = PRODUCT_COMMERCIALS.map((product) => ({
    path: `/home/products/${product.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  const solutionRoutes = solutionPages.map((solution) => ({
    path: `/home/solutions/${solution.slug}`,
    priority: 0.7,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...productRoutes, ...solutionRoutes].map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
