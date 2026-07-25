import type { Metadata } from "next";
import Link from "next/link";

import {
  AddOnTable,
  CtaBand,
  JsonLd,
  PageHero,
  PricingCards,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { pricingPrinciples, seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  LAUNCH_SPRINT_COPY,
  LAUNCH_SPRINT_DAYS,
  SCHOOL_STARTING_TERM_PRICE,
  STARTING_MONTHLY_PRICE,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  offerCatalogJsonLd,
} from "@/lib/marketing/seo";
import { Check } from "@/lib/icons";

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
        title="Accessible monthly pricing. Scoped setup before rollout."
        copy={`Corelith starts from ${formatUsd(STARTING_MONTHLY_PRICE)}/month for the software subscription. Implementation is scoped separately because migration, configuration, training and go-live support are real work.`}
      >
        <div className={styles.assuranceGrid}>
          <span>Subscription from {formatUsd(STARTING_MONTHLY_PRICE)}/month</span>
          <span>{LAUNCH_SPRINT_DAYS}-day Launch Sprint</span>
          <span>Schools from {formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term</span>
        </div>
      </PageHero>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Plans"
          title="Choose capacity and support level first."
          copy="The plan defines sites, capacity, support and bundled capability. The industry pack defines the first operating workflow."
        />
        <PricingCards />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Setup fee"
            title="Implementation is not hidden inside the subscription."
            copy={LAUNCH_SPRINT_COPY}
          />
          <div className={styles.cardGrid2}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>What setup covers</h2>
              <ul className={styles.checkList}>
                {[
                  "Workflow diagnosis",
                  "Configuration of the core system and one primary pack",
                  "Data import within agreed scope",
                  "Team training",
                  "First go-live support",
                  "WhatsApp follow-up",
                ].map((item) => (
                  <li key={item}>
                    <Check className={styles.icon} weight="regular" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Pricing principles</h2>
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
        <SectionIntro
          eyebrow="Add-ons"
          title="Add operational depth when the value is clear."
          copy="Extra branches, payroll, portals, accounting depth, ZIMRA fiscalisation and reporting should be visible before a proposal is written."
        />
        <AddOnTable />
      </section>

      <section className={styles.section}>
        <div className={styles.ctaPanel}>
          <div className={styles.sectionIntro}>
            <div className={styles.stack}>
              <p className={styles.eyebrow}>Schools</p>
              <h2 className={styles.sectionTitle}>Schools use a separate term-based pricing path.</h2>
            </div>
            <div className={styles.stack}>
              <p className={styles.lead}>
                Schools need implementation, data migration, staff training, parent portals, procurement and decision committees. The pricing model reflects that.
              </p>
              <Link href="/home/pricing/schools" className={styles.button}>
                See schools pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
