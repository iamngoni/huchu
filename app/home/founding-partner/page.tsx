import type { Metadata } from "next";

import {
  CtaBand,
  FoundingPartnerList,
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { launchTargets, seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  serviceJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.foundingPartner);

export default function FoundingPartnerPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          serviceJsonLd({
            name: "Corelith Founding Partner Programme",
            description: seoPages.foundingPartner.description,
            path: "/home/founding-partner",
            serviceType: "Business software implementation programme",
            keywords: seoPages.foundingPartner.keywords,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Founding Partner Programme", path: "/home/founding-partner" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Founding Partner Programme"
        title="For businesses ready to prove Corelith in real operations."
        copy="The programme is for selected trade and workshop businesses willing to implement a focused workflow, give structured feedback and measure whether the rollout changed the way the business runs."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Eligibility"
          title="This is not an open sandbox."
          copy="The best founding partners already feel stock, invoicing, branch, job-card or customer follow-up pain and have a manager ready to own the rollout."
        />
        <div className={styles.demoLayout}>
          <FoundingPartnerList />
          <aside className={styles.notePanel}>
            <p className={styles.eyebrow}>First 90 days</p>
            <div className={styles.statStack}>
              {launchTargets.map((target) => (
                <div key={target.value} className={styles.statTile}>
                  <strong>{target.value}</strong>
                  <span>{target.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What Corelith needs to learn"
            title="The programme exists to prove repeatable sales and implementation."
            copy="By the end of the first deals, Corelith should know whether the strongest wedge is commerce-heavy, workshop-heavy or another adjacent formalising trade workflow."
          />
          <div className={styles.cardGrid3}>
            {[
              "Can the sale close within 30 to 45 days?",
              "Can the customer go live without major custom development?",
              "Does the customer use the system weekly after launch?",
            ].map((question) => (
              <article key={question} className={styles.compactCard}>
                <p className={styles.cardTitle}>{question}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Apply with your real operating problem."
        copy="Tell Corelith what you run, where the leakage is and what would make the first rollout worth paying for."
        href="/home/book-demo?interest=commerce"
        label="Apply for founding partner review"
      />
    </SiteChrome>
  );
}
