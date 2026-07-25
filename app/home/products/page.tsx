import Link from "next/link";

import { ArrowRight } from "@/lib/icons";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/brand";
import { solutionPages } from "@/components/marketing/marketing-data";
import {
  PRODUCT_COMMERCIALS,
  STARTING_MONTHLY_PRICE,
  TRIAL_DAYS,
  formatUsd,
  productPriceLabel,
} from "@/lib/marketing/pricing";
import { breadcrumbJsonLd, buildMarketingMetadata } from "@/lib/marketing/seo";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingSubpageShell } from "@/components/marketing/marketing-subpage-shell";
import { StaggerChildren, StaggerItem } from "@/components/marketing/motion";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

export const metadata = buildMarketingMetadata({
  title: "Products",
  description: `Every ${PLATFORM_BRAND_NAME} product, with its own pricing. Gold, scrap, retail POS, schools, auto sales, HR, maintenance, compliance, CCTV, and stock. From ${formatUsd(STARTING_MONTHLY_PRICE)}/month.`,
  path: "/home/products",
  keywords: [
    "business management software Zimbabwe",
    "POS software Zimbabwe",
    "stock control software",
    "mining software Zimbabwe",
    "school management software",
  ],
});

/** Products in the order we want to sell them, richest verticals first. */
const PRODUCT_ORDER = [
  "retail-pos",
  "schools",
  "gold-operations",
  "scrap-recycling",
  "auto-sales",
  "stores-inventory",
  "human-resources-payroll",
  "maintenance",
  "compliance",
  "cctv-surveillance",
  "thrift-operations",
  "multi-site-operations",
];

export default function ProductsPage() {
  const products = PRODUCT_ORDER.map((slug) => {
    const commercials = PRODUCT_COMMERCIALS.find((product) => product.slug === slug);
    const solution = solutionPages.find((entry) => entry.slug === slug);
    if (!commercials || !solution) return null;
    return { commercials, solution, priceLabel: productPriceLabel(slug) };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: "Products", path: "/home/products" },
        ])}
      />

      <MarketingSubpageShell
        eyebrow="Products"
        title="One platform. Pick the products you actually need."
        description={`Every product runs on the same base — the same logins, the same reports, the same admin. Turn on what your business does, pay for nothing else. From ${formatUsd(STARTING_MONTHLY_PRICE)} a month.`}
        pills={[
          `${products.length} products ready today`,
          "Priced per site, not per user",
          `${TRIAL_DAYS}-day free trial`,
        ]}
        panelTitle="How to choose"
        panelBody="Start with the product that covers the workflow costing you the most right now. Add the next one when your team is ready — nothing gets rebuilt."
        panelLinks={[
          { label: "Compare pricing", href: "/home/pricing" },
          { label: "Book a demo", href: "/home/book-demo" },
        ]}
      >
        <StaggerChildren staggerDelay={0.06} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map(({ commercials, solution, priceLabel }) => {
            const Icon = solution.icon;

            return (
              <StaggerItem key={commercials.slug}>
                <Link
                  href={`/home/products/${commercials.slug}`}
                  className={`${styles.productCard} group`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#0f1f55] text-white">
                      <Icon className="size-4" />
                    </span>
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#0f1f55]">
                      {solution.title}
                    </h2>
                  </div>

                  <p className="text-sm leading-7 text-[#31436f]/84">{solution.summary}</p>

                  <div className="flex flex-wrap gap-2">
                    {solution.modules.slice(0, 4).map((module) => (
                      <span key={module} className={styles.productChip}>
                        {module}
                      </span>
                    ))}
                  </div>

                  <div className={styles.productCardPrice}>
                    <span className="font-semibold text-[#0b1945]">{priceLabel}</span>
                    <span className="ml-2 inline-flex items-center gap-1.5 text-[#0f1f55]">
                      See product
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        <section className={`mt-16 ${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Not sure which one?
              </p>
              <h2 className="max-w-2xl text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
                Tell us what is going wrong. We will tell you where to start.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/74">
                Fifteen minutes on a call is usually enough to work out which product pays for itself
                first. No slide deck, no pressure.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
              >
                <Link href="/home/book-demo">
                  Book a demo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-white/18 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/home/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </MarketingSubpageShell>
    </>
  );
}
