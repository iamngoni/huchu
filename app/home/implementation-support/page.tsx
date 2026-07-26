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
        title="The rollout is the part everybody underestimates."
        copy={`A ${LAUNCH_SPRINT_DAYS}-day Launch Sprint: ${LAUNCH_SPRINT_COPY}. Most software failures are not software failures — they are rollouts nobody ever finished. So we scope it, price it and own it.`}
      />

      <LaunchSprintSection />

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Success targets"
            title="A Launch Sprint ends with proof, not a login."
            copy="These are the things that have to be true before we call the rollout done. We agree them with you before it starts."
          />
          <div className={styles.cardGrid2}>
            {[
              "Products, customers, suppliers and opening balances loaded within the agreed scope",
              "Roles and permissions configured for the people doing the work",
              "First invoices, receipts, stock movements and job cards created on live data",
              "The first weekly operating report reviewed with the owner",
              "A named support channel agreed for follow-up questions and adoption issues",
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
          title="Every step has a job, and you can see all of them."
          copy="You should know exactly what happens, and in what order, before any money changes hands."
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
        copy="Your current tools, your locations, the state of your data and when you want to go live. That is enough for the first call to be useful rather than exploratory."
      />
    </SiteChrome>
  );
}
