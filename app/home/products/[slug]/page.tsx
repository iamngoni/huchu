import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRight, Check } from "@/lib/icons";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/brand";
import { getSolutionPage, solutionPages } from "@/components/marketing/marketing-data";
import {
  PRODUCT_COMMERCIALS,
  TRIAL_DAYS,
  formatUsd,
  getProductPricing,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  faqJsonLd,
  productJsonLd,
} from "@/lib/marketing/seo";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingSubpageShell } from "@/components/marketing/marketing-subpage-shell";
import { ProductPricingPanel } from "@/components/marketing/product-pricing-panel";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/marketing/motion";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PRODUCT_COMMERCIALS.map((product) => ({ slug: product.slug }));
}

function resolveProduct(slug: string) {
  const solution = getSolutionPage(slug);
  const pricing = getProductPricing(slug);
  if (!solution || !pricing) return null;
  return { solution, pricing };
}

function priceSentence(pricing: NonNullable<ReturnType<typeof getProductPricing>>): string {
  return pricing.pricingModel === "bespoke"
    ? "Priced per term against enrolment."
    : `From ${formatUsd(pricing.startingMonthly ?? 0)} a month.`;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const resolved = resolveProduct(slug);

  if (!resolved) {
    return buildMarketingMetadata({
      title: "Product",
      description: `${PLATFORM_BRAND_NAME} products.`,
      path: "/home/products",
      noIndex: true,
    });
  }

  const { solution, pricing } = resolved;

  return buildMarketingMetadata({
    title: `${solution.title} software`,
    description: `${solution.headline} ${priceSentence(pricing)} ${TRIAL_DAYS}-day free trial, no credit card. Built for Zimbabwean businesses and works offline.`,
    path: `/home/products/${slug}`,
    keywords: [
      `${solution.title.toLowerCase()} software Zimbabwe`,
      `${solution.title.toLowerCase()} management system`,
      ...solution.modules.map((module) => `${module.toLowerCase()} software`),
    ],
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const resolved = resolveProduct(slug);

  if (!resolved) {
    notFound();
  }

  const { solution, pricing } = resolved;
  const Icon = solution.icon;

  const relatedProducts = PRODUCT_COMMERCIALS.filter((product) => product.slug !== slug)
    .map((product) => solutionPages.find((entry) => entry.slug === product.slug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, 3);

  const faqs = [
    {
      q: `How much does ${solution.title.toLowerCase()} cost?`,
      a:
        pricing.pricingModel === "bespoke"
          ? "Schools are priced per term against enrolment rather than per month, because that is how schools budget. See the schools pricing page for the full ladder of bands."
          : `It starts at ${formatUsd(pricing.startingMonthly ?? 0)} a month — the ${pricing.entryTierName} plan plus the modules this product needs. Most teams running it properly land around ${formatUsd(pricing.typicalMonthly ?? 0)} a month on the ${pricing.recommendedTierName} plan.`,
    },
    {
      q: "Do I pay more for each person I add?",
      a: `No. ${PLATFORM_BRAND_NAME} is priced per site, not per seat. Adding another clerk or supervisor does not change your bill until you pass the plan's ceiling.`,
    },
    {
      q: "Does it work without internet?",
      a: "Yes. Work is captured on the device and syncs automatically when the connection comes back, so load-shedding and dead links do not stop your team.",
    },
    {
      q: "How long does setup take?",
      a: `You can be running on real data the same day. There is no implementation fee and no consultant required. Start with a ${TRIAL_DAYS}-day free trial and no credit card.`,
    },
    {
      q: "Can I add other parts of the business later?",
      a: "Yes. Every product sits on the same base, so adding accounting, payroll, maintenance, or another branch is a switch you turn on — not a new system to buy and learn.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          productJsonLd({
            name: solution.title,
            description: solution.summary,
            path: `/home/products/${slug}`,
            price: pricing.startingMonthly,
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Products", path: "/home/products" },
            { name: solution.title, path: `/home/products/${slug}` },
          ]),
        ]}
      />

      <MarketingSubpageShell
        eyebrow={solution.eyebrow}
        title={solution.headline}
        description={solution.summary}
        pills={[
          priceSentence(pricing),
          "Never priced per user",
          `${TRIAL_DAYS}-day free trial`,
        ]}
        panelTitle="Who this is for"
        panelBody={solution.audience}
        panelLinks={[
          { label: "See pricing", href: pricing.pricingHref },
          { label: "Book a demo", href: `/home/book-demo?product=${slug}` },
          { label: "All products", href: "/home/products" },
        ]}
      >
        {/* PRICE UP FRONT — no scroll hunt */}
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-5">
            <Reveal>
              <div className="flex size-12 items-center justify-center rounded-full bg-[#0f1f55] text-white">
                <Icon className="size-5" />
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={styles.stripeEyebrow}>What it costs</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="max-w-xl text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[0.99] tracking-[-0.05em] text-[#0b1945] text-balance">
                No quote required. Here is the price.
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="max-w-xl text-base leading-8 text-[#2d3d66]/82">
                You should not have to sit through a sales call to find out what software costs. This is
                what {solution.title.toLowerCase()} runs at, and what it includes.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <ProductPricingPanel slug={slug} productName={solution.title} />
          </Reveal>
        </section>

        {/* PAINS */}
        <section className="mt-18 grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>Why teams switch</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="max-w-xl text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[0.99] tracking-[-0.05em] text-[#0b1945] text-balance">
                What it looks like before you fix it.
              </h2>
            </Reveal>
          </div>

          <StaggerChildren staggerDelay={0.09} className="grid gap-4 md:grid-cols-3">
            {solution.pains.map((pain, index) => (
              <StaggerItem key={pain}>
                <article className={styles.productControlCard}>
                  <p className={styles.productFeatureEyebrow}>Pressure point 0{index + 1}</p>
                  <p className="mt-3 text-sm leading-7 text-[#31436f]/84">{pain}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* CAPABILITIES */}
        <section className="mt-18 grid gap-10 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>What you get</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="max-w-xl text-[clamp(1.9rem,3.4vw,3rem)] font-semibold leading-[0.99] tracking-[-0.05em] text-[#0b1945] text-balance">
                Built around the work your team already does.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex flex-wrap gap-2 pt-2">
                {solution.modules.map((module) => (
                  <span key={module} className={styles.productChip}>
                    {module}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <StaggerChildren staggerDelay={0.08} className="grid gap-4 md:grid-cols-2">
            {solution.capabilities.map((capability) => (
              <StaggerItem key={capability.title}>
                <article className={styles.productFeatureCard}>
                  <p className={styles.productFeatureEyebrow}>{capability.title}</p>
                  <p className="mt-3 text-sm leading-7 text-[#31436f]/84">{capability.copy}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* OUTCOMES + ROLLOUT */}
        <section className="mt-18 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[20px] border border-[#d6def5] bg-white p-7">
              <p className={styles.stripeEyebrow}>What owners get back</p>
              <ul className="mt-5 space-y-3">
                {solution.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#16a34a]" />
                    <span className="text-sm leading-7 text-[#31436f]/88">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="h-full rounded-[20px] border border-[#d6def5] bg-[#f7f9ff] p-7">
              <p className={styles.stripeEyebrow}>How rollout goes</p>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7383a9]">
                Start with
              </p>
              <p className="mt-2 text-sm leading-7 text-[#31436f]/88">{solution.startWith}</p>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7383a9]">
                Expand into
              </p>
              <p className="mt-2 text-sm leading-7 text-[#31436f]/88">{solution.expandWith}</p>

              {pricing.recommendedAddOns.length > 0 ? (
                <div className="mt-6 border-t border-[#d6def5] pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7383a9]">
                    Commonly added
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {pricing.recommendedAddOns.map((addOn) => (
                      <li key={addOn.code} className="flex justify-between gap-3 text-sm">
                        <span className="text-[#31436f]/88">{addOn.name}</span>
                        <span className="shrink-0 font-semibold text-[#0b1945]">
                          {formatUsd(addOn.monthlyPrice)}/mo
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="mt-18 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>Questions</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
                Before you book a demo
              </h2>
            </Reveal>
          </div>

          <StaggerChildren staggerDelay={0.06} className="grid gap-3">
            {faqs.map((faq) => (
              <StaggerItem key={faq.q}>
                <details className={styles.faqItem}>
                  <summary className="cursor-pointer list-none text-base font-semibold text-[#0f1f55]">
                    {faq.q}
                  </summary>
                  <p className="mt-2.5 text-sm leading-7 text-[#31436f]/84">{faq.a}</p>
                </details>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* RELATED */}
        <section className="mt-18">
          <Reveal>
            <p className={styles.stripeEyebrow}>Other products</p>
          </Reveal>
          <StaggerChildren staggerDelay={0.07} className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedProducts.map((related) => {
              const RelatedIcon = related.icon;
              return (
                <StaggerItem key={related.slug}>
                  <Link href={`/home/products/${related.slug}`} className={`${styles.productCard} group`}>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#0f1f55] text-white">
                        <RelatedIcon className="size-4" />
                      </span>
                      <p className="text-base font-semibold tracking-[-0.03em] text-[#0f1f55]">
                        {related.title}
                      </p>
                    </div>
                    <p className="text-sm leading-7 text-[#31436f]/84">{related.summary}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-medium text-[#0f1f55]">
                      See product
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </section>

        {/* CTA */}
        <section className={`mt-18 ${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Next step
              </p>
              <h2 className="max-w-2xl text-[clamp(1.9rem,3.5vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
                See it running on your own numbers.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/74">
                We will set up {solution.title.toLowerCase()} with your real data and show you the exact
                workflow your team would use. Fifteen minutes, no slide deck.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
              >
                <Link href={`/home/book-demo?product=${slug}`}>
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
                <Link href={pricing.pricingHref}>See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </MarketingSubpageShell>
    </>
  );
}
