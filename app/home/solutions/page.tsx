import type { Metadata } from "next";

import {
  CtaBand,
  JsonLd,
  MoneyTrailSection,
  PageHero,
  SectionIntro,
  SegmentCards,
  SiteChrome,
} from "@/app/home/site-components";
import { seoPages, segments } from "@/app/home/site-data";
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
          ...segments.map((segment) =>
            serviceJsonLd({
              name: `${segment.title} — business software`,
              description: segment.seo.description,
              path: segment.seo.path,
              serviceType: segment.title,
              keywords: segment.seo.keywords,
            }),
          ),
        ]}
      />
      <PageHero
        eyebrow="Solutions"
        title="Whatever you sell, the money leaves the same way."
        copy="Corelith does not arrive as an empty system waiting for a consultant. Pick the trade you are in and the screens, workflow and reports are already set up the way that business actually runs."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Choose your business"
          title="Start where the money is leaking."
          copy="Most businesses straddle two of these. That is normal — it is one system either way, and the second pack is a setting rather than a second project."
        />
        <SegmentCards />
      </section>

      <MoneyTrailSection />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Who this fits"
          title="The businesses that get the most out of it."
          copy="If you carry stock, run jobs, bill on account, or have more than one location, the gaps between your tools are already costing you real money."
        />
        <div className={styles.cardGrid3}>
          {segments.map((segment) => (
            <article key={segment.slug} className={styles.card}>
              <p className={styles.eyebrow}>{segment.title}</p>
              <h2 className={styles.cardTitle}>{segment.audience}</h2>
              <p className={styles.body}>{segment.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
