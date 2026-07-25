import type { Metadata } from "next";

import {
  CtaBand,
  JsonLd,
  PageHero,
  PrimarySolutionNote,
  SectionIntro,
  SiteChrome,
  SolutionCards,
} from "@/app/home/site-components";
import { seoPages, solutions } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  serviceJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.solutions);

export default function SolutionsPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Solutions", path: "/home/solutions" },
          ]),
          ...solutions.map((solution) =>
            serviceJsonLd({
              name: `${solution.title} software`,
              description: solution.seo.description,
              path: solution.seo.path,
              serviceType: solution.title,
              keywords: solution.seo.keywords,
            }),
          ),
        ]}
      />
      <PageHero
        eyebrow="Industry-ready workflows"
        title="Lead with the business pain, then show the system."
        copy="The site should not target every small business equally. It should speak to formalising operators with enough stock, invoices, customers, staff and compliance pressure to pay now."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Vertical hierarchy"
          title="Commerce first. Workshops and auto next. Schools separately."
          copy="That order reflects the GTM documents: trade businesses are the launch wedge, workshops and auto raise workflow value, and schools require enterprise buying logic."
        />
        <SolutionCards />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Who should respond"
            title="The right buyer already feels operational leakage."
            copy="They are using notebooks, Excel, WhatsApp and perhaps a separate POS or accounting tool, but they cannot get one clear answer about stock, customers, payments and work in progress."
          />
          <div className={styles.cardGrid3}>
            {solutions.map((solution) => (
              <article key={solution.slug} className={styles.card}>
                <p className={styles.eyebrow}>{solution.title}</p>
                <h2 className={styles.cardTitle}>{solution.audience}</h2>
                <p className={styles.body}>{solution.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <PrimarySolutionNote />
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
