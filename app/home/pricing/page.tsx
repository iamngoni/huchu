import type { Metadata } from "next";
import Link from "next/link";

import {
  AddOnTable,
  CtaBand,
  FaqSection,
  JsonLd,
  PageHero,
  PricingCards,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { pricingPrinciples, seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  ANNUAL_BILLING_MONTHS,
  LAUNCH_SPRINT_COPY,
  LAUNCH_SPRINT_DAYS,
  MARKETING_TIERS,
  MONEY_BACK_DAYS,
  SCHOOL_STARTING_TERM_PRICE,
  STARTING_MONTHLY_PRICE,
  TIER_COMPARISON_ROWS,
  USER_PACK_SIZE,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  offerCatalogJsonLd,
} from "@/lib/marketing/seo";
import { ArrowRight, Check } from "@/lib/icons";

export const metadata: Metadata = buildMarketingMetadata(seoPages.pricing);

export default function PricingPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          offerCatalogJsonLd("/home/pricing"),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Pricing", path: "/home/pricing" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Pricing"
        title="Priced per site. Never per user."
        copy={`From ${formatUsd(STARTING_MONTHLY_PRICE)} a month, with every cashier, clerk, technician and rep included up to your seat ceiling. Onboarding is scoped and quoted before you commit, so the human work is visible rather than buried in the subscription.`}
      >
        <div className={styles.assuranceGrid}>
          <span>Pay annually, pay for {ANNUAL_BILLING_MONTHS} months</span>
          <span>{MONEY_BACK_DAYS}-day money-back guarantee</span>
          <span>Schools from {formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term</span>
        </div>
      </PageHero>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Plans"
          title="Pick the plan by sites and capacity, not by headcount."
          copy="The plan sets how many sites you run, how many seats are included and how much finance and governance depth ships switched on. The industry pack sets what the middle of your workflow looks like."
        />
        <PricingCards />
        <p className={`${styles.small} ${styles.sectionFooter}`}>
          Extra seats are sold in packs of {USER_PACK_SIZE}. Extra sites are charged at each plan&rsquo;s
          per-site rate, shown in the comparison below.
        </p>
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Compare"
            title="Everything each plan includes, side by side."
            copy="Anything marked with a price is available as an add-on on the lower plans, at the monthly rate shown."
          />
          <div className={styles.tableFrame}>
            <table className={styles.table}>
              <caption className="sr-only">Corelith plan comparison</caption>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  {MARKETING_TIERS.map((tier) => (
                    <th key={tier.code} scope="col">
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
                      <td key={`${row.label}-${MARKETING_TIERS[index]?.code ?? index}`}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Add-ons"
          title="Buy depth when it pays for itself, not before."
          copy="Nothing here is hidden behind a sales call. If an add-on is already bundled into your plan, it costs you nothing."
        />
        <AddOnTable />
      </section>

      <section className={styles.bandSunken}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Onboarding"
            title="Setup is charged, and here is exactly what it buys."
            copy={`${LAUNCH_SPRINT_COPY}. It is a ${LAUNCH_SPRINT_DAYS}-day piece of work, scoped and quoted against your business before you sign anything.`}
          />
          <div className={styles.cardGrid2}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>What onboarding covers</h2>
              <ul className={styles.checkList}>
                {[
                  "Mapping how your business actually works today",
                  "Configuring the platform, your industry pack, sites and roles",
                  "Importing products, customers, suppliers and opening balances",
                  "Training the people who will use it daily",
                  "Being on the line through your first live day",
                  "WhatsApp follow-up through the first month",
                ].map((item) => (
                  <li key={item}>
                    <Check className={styles.icon} weight="regular" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/home/implementation-support" className={styles.inlineAction}>
                How the Launch Sprint runs
                <ArrowRight className={styles.icon} weight="regular" />
              </Link>
            </article>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>How the commercials work</h2>
              <ul className={styles.checkList}>
                {pricingPrinciples.map((principle) => (
                  <li key={principle}>
                    <Check className={styles.icon} weight="regular" />
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.commercialPanel}>
          <div className={styles.stack}>
            <p className={styles.eyebrow}>Schools</p>
            <h2 className={styles.sectionTitle}>Schools are priced per term, not per month.</h2>
            <p className={styles.body}>
              Fees come in three times a year, so the software cost sits in the same cycle. Bands are
              set by enrolment and every one includes unlimited staff accounts.
            </p>
          </div>
          <div className={styles.stack}>
            <p className={styles.price}>From {formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term</p>
            <Link href="/home/schools" className={styles.button}>
              See schools pricing
              <ArrowRight className={styles.icon} weight="regular" />
            </Link>
          </div>
        </div>
      </section>

      <FaqSection
        eyebrow="Pricing questions"
        title="What people ask before they sign."
        copy="Nothing here changes once you are a customer. If it is not on this page, it is not in your bill."
      />

      <CtaBand
        title="Get a real number for your business."
        copy="Sites, seats, the pack you need and how much data we migrate. Answer the setup questions and we will come back with a figure rather than a range."
      />
    </SiteChrome>
  );
}
