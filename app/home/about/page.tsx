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
        title="Built in Zimbabwe, for businesses that have outgrown running on memory."
        copy="Corelith is the business platform from Hurudza Labs. The job is unglamorous and specific: connect sales, stock, work, finance and people for growing operators — without a foreign-consultant ERP project and the bill that comes with it."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Point of view"
          title="The product is local because the constraints are."
          copy="This is not a patriotism pitch. It means load-shedding, patchy data, USD and ZWG side by side, WhatsApp-led communication, ZIMRA and the very real fear of a failed rollout are design inputs here rather than edge cases someone will get to later."
        />
        <CompanyPrinciples />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What Corelith is not"
            title="Not a cheap POS clone. Not an ERP slogan."
            copy="If Corelith wins, it wins because it starts from your workflow, shows you the rollout instead of hiding it, and grows out of the first problem that was actually costing you money."
          />
          <div className={styles.cardGrid3}>
            {[
              "You should understand what this is within ten seconds of landing here.",
              "You should recognise your own business on the page, not a generic one.",
              "Price, migration and rollout should be visible before a sales call, not after.",
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
