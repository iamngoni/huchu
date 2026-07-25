import type { Metadata } from "next";

import {
  CtaBand,
  FAQGrid,
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { faqs, seoPages } from "@/app/home/site-data";
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
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "FAQ", path: "/home/faq" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="FAQ"
        title="Questions buyers should ask before a tailored demo."
        copy="The serious questions are not about whether Corelith has many modules. They are about fit, price, implementation, migration, support and whether the first workflow will actually go live."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Answers"
          title="Fit, pricing, rollout and support."
          copy="These answers are intentionally direct because the website has to reduce risk before sales starts."
        />
        <FAQGrid />
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
