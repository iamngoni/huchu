import Link from "next/link";

import { ArrowRight } from "@/lib/icons";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/brand";
import { solutionPages } from "@/components/marketing/marketing-data";
import {
  COMPETITIVE_EDGE,
  MARKETING_TIERS,
  POPULAR_TIER,
  TCO_TEAM_SIZE,
  TRIAL_DAYS,
  formatUsd,
  productPriceLabel,
} from "@/lib/marketing/pricing";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/marketing/motion";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

/** Lead with the verticals that convert fastest. */
const FEATURED_PRODUCT_SLUGS = [
  "retail-pos",
  "schools",
  "gold-operations",
  "scrap-recycling",
  "auto-sales",
  "human-resources-payroll",
];

const PER_SEAT_MONTHLY_LOW = 25;

export function MarketingProductsPricing() {
  const products = FEATURED_PRODUCT_SLUGS.map((slug) => {
    const solution = solutionPages.find((entry) => entry.slug === slug);
    if (!solution) return null;
    return { solution, priceLabel: productPriceLabel(slug) };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const perSeatCost = PER_SEAT_MONTHLY_LOW * TCO_TEAM_SIZE;

  return (
    <>
      {/* PRODUCTS */}
      <section id="products" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-18 lg:px-8 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>Products</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="max-w-3xl text-[clamp(2.1rem,4.2vw,4rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#0b1945] text-balance">
                Your industry is already built.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-2xl text-base leading-8 text-[#2d3d66]/82">
                You are not funding a six-month implementation project to get a working system. Pick the
                product that matches your business and start today.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="lg:justify-self-end">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#0f1f55] text-white hover:bg-[#1a2d6b]"
            >
              <Link href="/home/products">
                See all products
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <StaggerChildren
          staggerDelay={0.07}
          className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {products.map(({ solution, priceLabel }) => {
            const Icon = solution.icon;
            return (
              <StaggerItem key={solution.slug}>
                <Link href={`/home/products/${solution.slug}`} className={`${styles.productCard} group`}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#0f1f55] text-white">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#0f1f55]">
                      {solution.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-[#31436f]/84">{solution.summary}</p>
                  <div className={styles.productCardPrice}>
                    <span className="font-semibold text-[#0b1945]">{priceLabel}</span>
                    <span className="ml-2 inline-flex items-center gap-1.5 text-[#0f1f55]">
                      Explore
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </section>

      {/* THE PER-USER ARGUMENT */}
      <section className="mx-auto max-w-7xl px-6 pb-18 lg:px-8 lg:pb-24">
        <Reveal>
          <div className={`${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                  The maths
                </p>
                <h2 className="max-w-2xl text-[clamp(2rem,3.6vw,3.2rem)] font-semibold leading-[1.01] tracking-[-0.045em] text-balance">
                  {TCO_TEAM_SIZE} staff. One price.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-white/74">
                  Per-seat suites charge for every person you add. At {TCO_TEAM_SIZE} staff that is around{" "}
                  {formatUsd(perSeatCost)} a month before you have configured anything. {PLATFORM_BRAND_NAME}{" "}
                  charges for sites, not people.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
                  >
                    <Link href="/home/pricing">
                      See the full comparison
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/12 bg-white/5 p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">
                    Per-seat cloud suite
                  </p>
                  <p className="mt-3 text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-white/70">
                    {formatUsd(perSeatCost)}
                  </p>
                  <p className="mt-2 text-sm text-white/56">
                    per month, and it climbs every time you hire
                  </p>
                </div>
                <div className="rounded-[18px] border border-[#ff6b35]/40 bg-[#ff6b35]/10 p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb694]">
                    {PLATFORM_BRAND_NAME} {POPULAR_TIER.name}
                  </p>
                  <p className="mt-3 text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-white">
                    {formatUsd(POPULAR_TIER.monthlyPrice)}
                  </p>
                  <p className="mt-2 text-sm text-white/72">
                    per month, covering {POPULAR_TIER.includedUsers} people across{" "}
                    {POPULAR_TIER.includedSites} sites
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* WHY US */}
      <section className="mx-auto max-w-7xl px-6 pb-18 lg:px-8 lg:pb-24">
        <div className="space-y-4">
          <Reveal>
            <p className={styles.stripeEyebrow}>Why teams pick us</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-3xl text-[clamp(2.1rem,4.2vw,4rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#0b1945] text-balance">
              Built for how business actually works here.
            </h2>
          </Reveal>
        </div>

        <StaggerChildren
          staggerDelay={0.07}
          className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {COMPETITIVE_EDGE.map((edge) => (
            <StaggerItem key={edge.title}>
              <article className={styles.verticalCard}>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[#0f1f55]">{edge.title}</p>
                <p className="mt-3 text-sm leading-7 text-[#31436f]/82">{edge.copy}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-18 lg:px-8 lg:pb-24">
        <div className="space-y-4 text-center">
          <Reveal>
            <p className={styles.stripeEyebrow}>Pricing</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mx-auto max-w-3xl text-[clamp(2.1rem,4.2vw,4rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#0b1945] text-balance">
              Plain prices. On the website.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto max-w-2xl text-base leading-8 text-[#2d3d66]/82">
              No &ldquo;request a quote&rdquo; wall. Pick your plan, start a {TRIAL_DAYS}-day trial
              without a credit card, and cancel in one click if it is not earning its keep.
            </p>
          </Reveal>
        </div>

        <StaggerChildren
          staggerDelay={0.07}
          className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {MARKETING_TIERS.map((tier) => (
            <StaggerItem key={tier.code}>
              <Link
                href="/home/pricing"
                className={`${styles.productCard} group ${
                  tier.isMostPopular ? "ring-2 ring-[#ff6b35] ring-offset-2" : ""
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7383a9]">
                  {tier.tagline}
                </p>
                <h3 className="text-xl font-semibold tracking-[-0.035em] text-[#0f1f55]">{tier.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[2.2rem] font-bold leading-none tracking-[-0.05em] text-[#0b1945]">
                    {formatUsd(tier.monthlyPrice)}
                  </span>
                  <span className="text-sm text-[#7383a9]">/mo</span>
                </div>
                <p className="text-sm leading-7 text-[#31436f]/84">{tier.bestFor}</p>
                <div className={styles.productCardPrice}>
                  <span>
                    {tier.includedSites} {tier.includedSites === 1 ? "site" : "sites"} ·{" "}
                    {tier.includedUsers === null ? "Unlimited" : tier.includedUsers} people
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-[#0f1f55] text-white hover:bg-[#1a2d6b]">
              <Link href="/home/pricing">
                Compare all plans
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-[#d6def5] bg-white text-[#0b1945] hover:bg-[#f6f8ff]"
            >
              <Link href="/home/pricing/schools">Schools pricing</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
