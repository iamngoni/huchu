import Link from "next/link";

import { ArrowRight, Check, X } from "@/lib/icons";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/brand";
import {
  COMPETITIVE_EDGE,
  MARKETING_TIERS,
  MONEY_BACK_DAYS,
  SCHOOL_STARTING_TERM_PRICE,
  STARTING_MONTHLY_PRICE,
  TCO_ROWS,
  TCO_SITE_COUNT,
  TCO_TEAM_SIZE,
  TIER_COMPARISON_ROWS,
  TRIAL_DAYS,
  addOnsByCategory,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  faqJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/marketing/seo";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingSubpageShell } from "@/components/marketing/marketing-subpage-shell";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/marketing/motion";
import { PricingCalculator } from "@/components/marketing/pricing-calculator";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

const PRICING_FAQS = [
  {
    q: "Do you charge per user?",
    a: `No. ${PLATFORM_BRAND_NAME} is priced per site, not per seat. Every plan includes a generous number of people, and adding another cashier or clerk does not change your bill until you pass that ceiling. Suites that charge per user would bill you every month for the same person.`,
  },
  {
    q: "What counts as a site?",
    a: "A site is a physical location you operate: a shop, a branch, a yard, a mine, or a campus. Plans include several sites, and extra sites are charged at a flat monthly rate shown on each plan.",
  },
  {
    q: "Is there a contract?",
    a: "No. Billing is monthly and you can cancel at any time with no cancellation fee. Yearly billing is optional and gives you two months free.",
  },
  {
    q: `What happens after the ${TRIAL_DAYS}-day trial?`,
    a: `You pick a plan and add payment details. If you decide not to subscribe, your data stays available for ${MONEY_BACK_DAYS} days so you can export it, then it is deleted.`,
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade at any time. Changes take effect on your next billing date, and any add-ons you have bought move with you.",
  },
  {
    q: "How do add-ons work?",
    a: "Add-ons sit on top of your plan price. Each one has a base monthly price plus a smaller rate for each site beyond your first. Higher plans already include several add-ons at no extra cost, which is shown on the plan card.",
  },
  {
    q: "What if the internet goes down?",
    a: `${PLATFORM_BRAND_NAME} works offline. Sales, stock, and attendance are captured on the device and sync automatically when the connection returns. This is built for Zimbabwean connectivity, not bolted on.`,
  },
  {
    q: "Do you handle ZIMRA fiscalisation?",
    a: "Yes. Tax codes, VAT configuration, and the ZIMRA FDMS fiscalisation connector are available as an add-on and are included on the Enterprise plan.",
  },
  {
    q: "How are schools priced?",
    a: `Schools are priced per term against enrolment bands rather than monthly, because that is how schools budget. Bands start at ${formatUsd(SCHOOL_STARTING_TERM_PRICE)} per term. See the schools pricing page for the full ladder.`,
  },
  {
    q: "Can I get a refund?",
    a: `If ${PLATFORM_BRAND_NAME} is not working for you in your first month, contact us for a full refund. No questions asked.`,
  },
];

export const metadata = buildMarketingMetadata({
  title: "Pricing",
  description: `${PLATFORM_BRAND_NAME} pricing for Zimbabwean businesses. Plans from ${formatUsd(STARTING_MONTHLY_PRICE)}/month, priced per site and never per user. ${TRIAL_DAYS}-day free trial, no credit card.`,
  path: "/home/pricing",
  keywords: [
    "business software pricing Zimbabwe",
    "ERP pricing Zimbabwe",
    "POS software price Zimbabwe",
    "stock management software cost",
    "no per user pricing",
  ],
});

export default function PricingPage() {
  const addOnGroups = addOnsByCategory();

  return (
    <>
      <JsonLd
        data={[
          softwareApplicationJsonLd(),
          faqJsonLd(PRICING_FAQS),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Pricing", path: "/home/pricing" },
          ]),
        ]}
      />

      <MarketingSubpageShell
        eyebrow="Pricing"
        title="Priced per site. Never per user."
        description={`Add every cashier, clerk, supervisor, and driver you need — your bill does not move. Plans start at ${formatUsd(STARTING_MONTHLY_PRICE)} a month with a ${TRIAL_DAYS}-day free trial and no credit card.`}
        pills={[
          "No per-user fees",
          `From ${formatUsd(STARTING_MONTHLY_PRICE)}/month`,
          `${TRIAL_DAYS}-day free trial`,
        ]}
        panelTitle="How pricing works"
        panelBody="Pick a plan for the number of sites you run, then add only the industry modules you need. Higher plans bundle add-ons at no extra cost."
        panelLinks={[
          { label: "Compare plans", href: "#comparison" },
          { label: "Schools pricing", href: "/home/pricing/schools" },
          { label: "Book a demo", href: "/home/book-demo" },
        ]}
      >
        <PricingPlans />

        {/* ADD-ONS */}
        <section id="add-ons" className="mt-20 scroll-mt-24">
          <Reveal>
            <p className={styles.stripeEyebrow}>Add-ons</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              Add your industry. Pay for nothing else.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#31436f]/82">
              Each add-on has a base price plus a smaller rate for every site beyond your first. Add-ons
              marked as included cost nothing on that plan.
            </p>
          </Reveal>

          <div className="mt-9 space-y-10">
            {addOnGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#7383a9]">
                  {group.category}
                </h3>
                <StaggerChildren
                  staggerDelay={0.06}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {group.addOns.map((addOn) => (
                    <StaggerItem key={addOn.code}>
                      <article className={styles.addOnCard}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-semibold leading-6 text-[#0f1f55]">{addOn.name}</p>
                          <span className={styles.addOnPrice}>{formatUsd(addOn.monthlyPrice)}</span>
                        </div>
                        <p className="text-sm leading-6 text-[#31436f]/78">{addOn.description}</p>
                        <p className="text-xs text-[#7383a9]">
                          {addOn.additionalSiteMonthlyPrice > 0
                            ? `+${formatUsd(addOn.additionalSiteMonthlyPrice)}/mo per extra site · ${addOn.featureCount} features`
                            : `${addOn.featureCount} features`}
                        </p>
                        {addOn.includedInTiers.length > 0 ? (
                          <span className={styles.addOnIncluded}>
                            Included on{" "}
                            {addOn.includedInTiers
                              .map(
                                (code) =>
                                  MARKETING_TIERS.find((tier) => tier.code === code)?.name ?? code,
                              )
                              .join(", ")}
                          </span>
                        ) : null}
                      </article>
                    </StaggerItem>
                  ))}
                </StaggerChildren>
              </div>
            ))}
          </div>

          <Reveal>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[#d6def5] bg-[#f7f9ff] p-6">
              <div>
                <p className="text-base font-semibold text-[#0f1f55]">Running a school?</p>
                <p className="mt-1 text-sm text-[#31436f]/82">
                  Schools are priced per term against enrolment, not per month. Bands start at{" "}
                  {formatUsd(SCHOOL_STARTING_TERM_PRICE)} a term.
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/home/pricing/schools">
                  See schools pricing
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>

        {/* ESTIMATOR */}
        <section id="estimate" className="mt-20 scroll-mt-24">
          <Reveal>
            <p className={styles.stripeEyebrow}>Build your quote</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              Work out your number before you talk to anyone
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#31436f]/82">
              Pick your industries and how many sites you run. This is the same maths we bill on — no
              surprises on the invoice.
            </p>
          </Reveal>

          <div className="mt-9">
            <PricingCalculator />
          </div>
        </section>

        {/* COMPARISON */}
        <section id="comparison" className="mt-20 scroll-mt-24">
          <Reveal>
            <p className={styles.stripeEyebrow}>Compare plans</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              What is in each plan
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 overflow-hidden rounded-[18px] border border-[#d6def5] bg-white">
              <div className="max-h-[38rem] overflow-auto">
                <table className={styles.matrixTable}>
                  <caption className="sr-only">
                    Feature comparison across {PLATFORM_BRAND_NAME} plans
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Feature</th>
                      {MARKETING_TIERS.map((tier) => (
                        <th
                          key={tier.code}
                          scope="col"
                          className={tier.isMostPopular ? styles.matrixHighlight : undefined}
                        >
                          {tier.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIER_COMPARISON_ROWS.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {row.values.map((value, index) => (
                          <td
                            key={`${row.label}-${MARKETING_TIERS[index].code}`}
                            className={
                              MARKETING_TIERS[index].isMostPopular ? styles.matrixHighlight : undefined
                            }
                          >
                            {value === "Included" ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-[#166534]">
                                <Check className="size-4" aria-hidden="true" />
                                <span className="sr-only">Included</span>
                              </span>
                            ) : value === "—" ? (
                              <span className="text-[#94a3c4]">
                                <X className="size-4" aria-hidden="true" />
                                <span className="sr-only">Not included</span>
                              </span>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* TOTAL COST OF OWNERSHIP */}
        <section id="compare-alternatives" className="mt-20 scroll-mt-24">
          <Reveal>
            <p className={styles.stripeEyebrow}>The real cost</p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              What the alternatives actually cost you
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#31436f]/82">
              A realistic Zimbabwean SME: {TCO_TEAM_SIZE} staff across {TCO_SITE_COUNT} sites. Competitor
              figures are published list prices and are indicative — your quote will differ.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-8 overflow-hidden rounded-[18px] border border-[#d6def5] bg-white">
              <div className="overflow-x-auto">
                <table className={styles.tcoTable}>
                  <caption className="sr-only">
                    Total cost of ownership compared with per-seat suites, legacy desktop accounting, and
                    spreadsheets
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">&nbsp;</th>
                      <th scope="col">{PLATFORM_BRAND_NAME}</th>
                      <th scope="col">Per-seat cloud suite</th>
                      <th scope="col">Legacy desktop accounting</th>
                      <th scope="col">Spreadsheets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TCO_ROWS.map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="font-medium text-[#31436f]">
                          {row.label}
                        </th>
                        <td>{row.corelith}</td>
                        <td className="text-[#31436f]/78">{row.perSeatSuite}</td>
                        <td className="text-[#31436f]/78">{row.legacyDesktop}</td>
                        <td className="text-[#31436f]/78">{row.spreadsheets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </section>

        {/* WHY US */}
        <section className={`mt-20 ${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
              Why teams pick us
            </p>
            <h2 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.2vw,2.8rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
              Six reasons the switch pays for itself
            </h2>
          </Reveal>

          <StaggerChildren staggerDelay={0.08} className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COMPETITIVE_EDGE.map((edge, index) => (
              <StaggerItem key={edge.title}>
                <article className={styles.edgeCard}>
                  <span className={styles.edgeCardNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg font-semibold leading-6 tracking-[-0.02em] text-white">
                    {edge.title}
                  </h3>
                  <p className="text-sm leading-7 text-white/72">{edge.copy}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* FAQ */}
        <section className="mt-20 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>Common questions</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
                Questions before you start
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-base leading-7 text-[#2d3d66]/82">
                If your question is not here, message us on WhatsApp. We reply within two hours during
                business days.
              </p>
            </Reveal>
          </div>

          <StaggerChildren staggerDelay={0.06} className="grid gap-3">
            {PRICING_FAQS.map((faq) => (
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

        {/* FINAL CTA */}
        <section className={`mt-20 ${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Ready to start?
              </p>
              <h2 className="max-w-2xl text-[clamp(2rem,3.7vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
                Stop paying for chaos.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/74">
                Start free for {TRIAL_DAYS} days. No credit card, no contract, no setup fee. If it is not
                saving you time and money, cancel with one click.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
              >
                <Link href="/home/book-demo">
                  Start free for {TRIAL_DAYS} days
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-white/18 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/home/products">Explore products</Link>
              </Button>
            </div>
          </div>
        </section>
      </MarketingSubpageShell>
    </>
  );
}
