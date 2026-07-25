import Link from "next/link";

import { ArrowRight, Check } from "@/lib/icons";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/brand";
import {
  SCHOOL_ADD_ONS,
  SCHOOL_PRICING_BANDS,
  SCHOOL_STARTING_TERM_PRICE,
  TERMS_PER_YEAR,
  TRIAL_DAYS,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  faqJsonLd,
  productJsonLd,
} from "@/lib/marketing/seo";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingSubpageShell } from "@/components/marketing/marketing-subpage-shell";
import { Reveal, StaggerChildren, StaggerItem } from "@/components/marketing/motion";
import { SchoolPricingCalculator } from "@/components/marketing/school-pricing-calculator";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

const SCHOOL_FAQS = [
  {
    q: "Why is school pricing different from your other plans?",
    a: "Schools budget per term against enrolment, not per month against sites. Charging a school the same way we charge a scrap yard would make planning harder for your bursar, so we price the way schools already think.",
  },
  {
    q: "Do you charge per teacher or per admin account?",
    a: "No. Staff accounts are unlimited on every band. Teachers, bursars, heads of department, and administrators all get access at no extra cost.",
  },
  {
    q: "What happens if our enrolment grows mid-year?",
    a: "Nothing changes until your next term. If you cross into a higher band, we move you at the start of the following term so your budget is never disrupted mid-term.",
  },
  {
    q: "Can parents and students get their own logins?",
    a: "Yes. Parent and student portals are included from the Standard band. Parents can see attendance, results, and fee statements without phoning the office.",
  },
  {
    q: "Do you handle boarding?",
    a: "Yes. Hostels, bed allocation, leave and outing workflows are included in the Premier band, built for schools running full boarding operations.",
  },
  {
    q: "Can you move our existing records across?",
    a: "Yes. Data migration is a one-off add-on. We import your existing student, fee, and staff records so you are not re-typing years of history.",
  },
  {
    q: "Is there a free trial for schools?",
    a: `Yes. You get ${TRIAL_DAYS} days free with no credit card. We recommend starting at the beginning of a term so you can run admissions and fees on real data.`,
  },
];

export const metadata = buildMarketingMetadata({
  title: "School management software pricing",
  description: `School management pricing from ${formatUsd(SCHOOL_STARTING_TERM_PRICE)} per term. Admissions, attendance, fees, results, boarding, and parent portals. Unlimited staff accounts. ${TRIAL_DAYS}-day free trial.`,
  path: "/home/pricing/schools",
  keywords: [
    "school management system Zimbabwe",
    "school management software pricing",
    "school fees management software",
    "student information system Zimbabwe",
    "parent portal school software",
    "boarding school management software",
  ],
});

export default function SchoolsPricingPage() {
  return (
    <>
      <JsonLd
        data={[
          productJsonLd({
            name: "School Operations",
            description:
              "Admissions, attendance, fees, results, boarding, and parent portals for Zimbabwean schools, priced per term against enrolment.",
            path: "/home/pricing/schools",
            price: SCHOOL_STARTING_TERM_PRICE,
          }),
          faqJsonLd(SCHOOL_FAQS),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/home/pricing" },
            { name: "Schools", path: "/home/pricing/schools" },
          ]),
        ]}
      />

      <MarketingSubpageShell
        eyebrow="Schools pricing"
        title="Priced per term, the way schools budget."
        description={`Bands start at ${formatUsd(SCHOOL_STARTING_TERM_PRICE)} per term and cover your whole campus — admissions, attendance, fees, results, and portals. Teachers and administrators are never charged per head.`}
        pills={[
          `From ${formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term`,
          "Unlimited staff accounts",
          `${TERMS_PER_YEAR} terms a year`,
        ]}
        panelTitle="Why schools are priced differently"
        panelBody="School finances run on terms and enrolment, not months and sites. Your band is set by how many students you have, and everything in that band is included."
        panelLinks={[
          { label: "Book a school demo", href: "/home/book-demo?plan=schools" },
          { label: "School product tour", href: "/home/products/schools" },
          { label: "All pricing", href: "/home/pricing" },
        ]}
      >
        <Reveal>
          <SchoolPricingCalculator />
        </Reveal>

        {/* BANDS */}
        <section className="mt-16">
          <Reveal>
            <p className={styles.stripeEyebrow}>Enrolment bands</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              One band covers your whole campus
            </h2>
          </Reveal>

          <StaggerChildren staggerDelay={0.09} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {SCHOOL_PRICING_BANDS.map((band) => (
              <StaggerItem key={band.code}>
                <article
                  className={`${styles.schoolBandCard} ${
                    band.isMostPopular ? styles.schoolBandCardFeatured : ""
                  }`}
                >
                  {band.isMostPopular ? <span className={styles.planBadge}>Most schools</span> : null}

                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7383a9]">
                    {band.maxStudents === null
                      ? "Over 1,500 students"
                      : `Up to ${band.maxStudents.toLocaleString("en-US")} students`}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[#0b1945]">
                    {band.name}
                  </h3>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    {band.termPrice === null ? (
                      <span className="text-[2rem] font-bold leading-none tracking-[-0.04em] text-[#0b1945]">
                        Custom
                      </span>
                    ) : (
                      <>
                        <span className="text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-[#0b1945]">
                          {formatUsd(band.termPrice)}
                        </span>
                        <span className="text-sm text-[#7383a9]">/ term</span>
                      </>
                    )}
                  </div>

                  {band.termPrice !== null && band.maxStudents !== null ? (
                    <p className="mt-1.5 text-xs text-[#c2410c]">
                      As low as ${(band.termPrice / band.maxStudents).toFixed(2)} per student per term
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-[#c2410c]">Volume rates for school groups</p>
                  )}

                  <p className="mt-4 text-sm leading-6 text-[#31436f]/84">{band.summary}</p>

                  <div className="my-5 h-px bg-[#e2e8f6]" />

                  <ul className="space-y-2.5">
                    {band.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-[#16a34a]" />
                        <span className="text-[#31436f]/88">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      size="lg"
                      className={`w-full rounded-full ${
                        band.isMostPopular
                          ? "bg-[#0f1f55] text-white hover:bg-[#0f1f55]/90"
                          : "bg-white text-[#0f1f55] ring-1 ring-inset ring-[#0f1f55]/20 hover:bg-[#f0f4ff]"
                      }`}
                    >
                      <Link href={`/home/book-demo?plan=schools&band=${band.code.toLowerCase()}`}>
                        {band.termPrice === null ? "Request a quote" : "Book a demo"}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* SCHOOL ADD-ONS */}
        <section className="mt-18">
          <Reveal>
            <p className={styles.stripeEyebrow}>Optional extras</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
              Add only what your school runs
            </h2>
          </Reveal>

          <StaggerChildren staggerDelay={0.07} className="mt-8 grid gap-3 sm:grid-cols-2">
            {SCHOOL_ADD_ONS.map((addOn) => (
              <StaggerItem key={addOn.name}>
                <article className={styles.addOnCard}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-semibold leading-6 text-[#0f1f55]">{addOn.name}</p>
                    <span className={styles.addOnPrice}>
                      {formatUsd(addOn.termPrice)}
                      <span className="ml-1 text-xs font-medium text-[#7383a9]">/term</span>
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#31436f]/78">{addOn.description}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </section>

        {/* FAQ */}
        <section className="mt-18 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-4">
            <Reveal>
              <p className={styles.stripeEyebrow}>School questions</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="text-[clamp(1.7rem,3vw,2.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-[#0b1945]">
                What bursars ask us first
              </h2>
            </Reveal>
          </div>

          <StaggerChildren staggerDelay={0.06} className="grid gap-3">
            {SCHOOL_FAQS.map((faq) => (
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

        <section className={`mt-18 ${styles.ctaWrap} px-6 py-12 text-white lg:px-10`}>
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
                Start next term
              </p>
              <h2 className="max-w-2xl text-[clamp(2rem,3.7vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance">
                Get your school off paper before the next intake.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/74">
                We will walk through admissions, fees, and results with your real school data, then give
                you a written quote for your enrolment.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
              >
                <Link href="/home/book-demo?plan=schools">
                  Book a school demo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-white/18 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/home/products/schools">See the school product</Link>
              </Button>
            </div>
          </div>
        </section>
      </MarketingSubpageShell>

      <p className="sr-only">
        {PLATFORM_BRAND_NAME} school management software pricing for Zimbabwe.
      </p>
    </>
  );
}
