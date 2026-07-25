import type { Metadata } from "next";

import {
  PLATFORM_BRAND_NAME,
  PLATFORM_MARKETING_DOMAIN,
  PLATFORM_MARKETING_DESCRIPTION,
} from "@/lib/platform/brand";
import {
  MARKETING_TIERS,
  STARTING_MONTHLY_PRICE,
  TRIAL_DAYS,
} from "@/lib/marketing/pricing";

/**
 * Absolute origin for the public marketing site. Canonical URLs, sitemaps, and
 * social cards all need a real origin, so this falls back to the brand domain
 * rather than emitting relative URLs that crawlers cannot resolve.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");

  const raw = configured || `https://${PLATFORM_MARKETING_DOMAIN}`;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  return withProtocol.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

type MarketingMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** Set on pages that should stay out of the index (thank-you pages, etc). */
  noIndex?: boolean;
};

/**
 * Builds page metadata with a canonical URL and matching Open Graph/Twitter
 * cards. Every marketing page should use this so no page ships without a
 * canonical or a social preview.
 */
export function buildMarketingMetadata({
  title,
  description,
  path,
  keywords,
  noIndex,
}: MarketingMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | ${PLATFORM_BRAND_NAME}`,
      description,
      url,
      siteName: PLATFORM_BRAND_NAME,
      type: "website",
      locale: "en_ZW",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${PLATFORM_BRAND_NAME}`,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PLATFORM_BRAND_NAME,
    url: getSiteUrl(),
    description: PLATFORM_MARKETING_DESCRIPTION,
    areaServed: { "@type": "Country", name: "Zimbabwe" },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        url: absoluteUrl("/home/book-demo"),
        availableLanguage: ["en"],
      },
    ],
  };
}

/**
 * The product itself, with the tier ladder as an offer catalog. Prices come
 * from the billing catalog, so rich results cannot advertise a stale price.
 */
export function softwareApplicationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PLATFORM_BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description: PLATFORM_MARKETING_DESCRIPTION,
    url: getSiteUrl(),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: STARTING_MONTHLY_PRICE,
      highPrice: Math.max(...MARKETING_TIERS.map((tier) => tier.monthlyPrice)),
      offerCount: MARKETING_TIERS.length,
      offers: MARKETING_TIERS.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: tier.monthlyPrice,
        priceCurrency: "USD",
        url: absoluteUrl("/home/pricing"),
      })),
    },
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  path: string;
  price: number | null;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${input.name} — ${PLATFORM_BRAND_NAME}`,
    description: input.description,
    brand: { "@type": "Brand", name: PLATFORM_BRAND_NAME },
    url: absoluteUrl(input.path),
    offers:
      input.price === null
        ? {
            "@type": "Offer",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(input.path),
          }
        : {
            "@type": "Offer",
            price: input.price,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(input.path),
          },
  };
}

export function faqJsonLd(faqs: Array<{ q: string; a: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export const TRIAL_COPY = `${TRIAL_DAYS}-day free trial, no credit card required`;
