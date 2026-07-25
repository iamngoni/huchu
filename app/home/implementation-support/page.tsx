import type { Metadata } from "next";

import {
  CtaBand,
  JsonLd,
  LaunchSprintSection,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { launchSprintSteps, seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  LAUNCH_SPRINT_COPY,
  LAUNCH_SPRINT_DAYS,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  launchSprintJsonLd,
} from "@/lib/marketing/seo";
import { Check } from "@/lib/icons";

export const metadata: Metadata = buildMarketingMetadata(seoPages.implementation);

export default function ImplementationSupportPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          launchSprintJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Implementation", path: "/home/implementation-support" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Implementation and support"
        title="The rollout is part of the product."
        copy={`${LAUNCH_SPRINT_DAYS}-day Launch Sprint: ${LAUNCH_SPRINT_COPY}. This is how Corelith reduces the fear of lost data, disruption, staff resistance and abandoned support.`}
      />

      <LaunchSprintSection />

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Success targets"
            title="A Launch Sprint should end with operating proof, not a vague login."
            copy="The first rollout is scoped around the workflows that make the customer ready to keep using the system weekly."
          />
          <div className={styles.cardGrid2}>
            {[
              "Products, customers, suppliers or school records loaded within agreed scope",
              "Roles and permissions configured for the people doing the work",
              "First invoices, receipts, stock receipts, job cards or school fee records created",
              "First weekly operating report reviewed with the owner or leadership team",
              "Support channel agreed for follow-up questions and adoption issues",
              "Next module or add-on identified only when it pays for itself",
            ].map((target) => (
              <article key={target} className={styles.compactCard}>
                <Check className={styles.cardIcon} weight="regular" />
                <p className={styles.cardTitle}>{target}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Rollout steps"
          title="Every step has a job."
          copy="Implementation should feel practical, calm and accountable. The buyer should know what happens before money changes hands."
        />
        <div className={styles.tableFrame}>
          <table className={styles.table}>
            <caption className="sr-only">Corelith Launch Sprint steps</caption>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {launchSprintSteps.map((step) => (
                <tr key={step.title}>
                  <th scope="row">{step.title}</th>
                  <td>{step.copy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CtaBand
        title="Start with a setup questionnaire, not a blank account."
        copy="Tell us your current tools, locations, data, workflow pressure and go-live timing so the rollout conversation is practical from the first call."
      />
    </SiteChrome>
  );
}
