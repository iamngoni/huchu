import type { Metadata } from "next";

import {
  CompanyPrinciples,
  CtaBand,
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  organizationJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.about);

export default function AboutPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "About", path: "/home/about" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Company"
        title="Built in Zimbabwe for businesses that are becoming more formal, more complex and harder to run from memory."
        copy="Corelith is the business platform from Hurudza Labs. The immediate job is practical: help growing operators connect sales, stock, customers, finance and teams without forcing them into a foreign-consultant ERP project."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Point of view"
          title="The product is local because the operating reality is local."
          copy="That does not mean the site should rely on vague patriotic copy. It means the product should understand WhatsApp-heavy communication, branch control, cash and bank transfers, multi-currency pressure, fiscalisation, implementation anxiety and staff adoption."
        />
        <CompanyPrinciples />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What Corelith is not"
            title="Not a cheap POS clone. Not a broad ERP slogan."
            copy="Corelith should win because it starts with the customer's workflow, makes implementation visible and grows progressively from the first painful operating problem."
          />
          <div className={styles.cardGrid3}>
            {[
              "The buyer should understand the product in ten seconds.",
              "The right visitor should immediately recognise their industry.",
              "Pricing, migration, implementation and support should reduce fear early.",
            ].map((item) => (
              <article key={item} className={styles.compactCard}>
                <p className={styles.cardTitle}>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
