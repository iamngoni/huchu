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
        copy="A limited number of sellers, service providers, workshops and manufacturers who will put one workflow live properly, give us honest feedback, and agree up front how we measure whether it worked."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Eligibility"
          title="This is not an open sandbox."
          copy="The best founding partners already know exactly where the money is leaking, and have someone senior enough to own the rollout inside the business."
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
            title="We are being upfront: you are also helping us prove something."
            copy="These first rollouts tell us whether the product goes live cleanly and gets used. That is why the terms are better — it is a genuine exchange, not a discount dressed up as an invitation."
          />
          <div className={styles.cardGrid3}>
            {[
              "Does a rollout go live inside the sprint we scoped?",
              "Does it go live without custom development?",
              "Is the team still using it, unprompted, three months later?",
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
        copy="Tell us what you run, where the money is going missing, and what the first rollout would have to change to be worth paying for."
        href="/home/book-demo"
        label="Apply for founding partner review"
      />
    </SiteChrome>
  );
}
