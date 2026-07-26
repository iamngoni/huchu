import type { Metadata } from "next";

import {
  CtaBand,
  FAQList,
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { faqs, schoolsTrack, seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  faqJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.faq);

export default function FAQPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          faqJsonLd([...faqs, ...schoolsTrack.faqs]),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "FAQ", path: "/home/faq" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="FAQ"
        title="Straight answers, including the ones that might rule us out."
        copy="The useful questions are not about how many modules we have. They are about fit, price, rollout risk, migration and what happens the week after go-live."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="General"
          title="Fit, pricing, rollout and support."
          copy="If one of these answers is a dealbreaker for your business, it is far cheaper to know now."
        />
        <FAQList items={faqs} />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Schools"
            title="Questions from school leadership."
            copy="Schools buy differently, so they get their own answers — and their own page."
          />
          <FAQList items={[...schoolsTrack.faqs]} />
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
