import type { Metadata } from "next";

import {
  CtaBand,
  JsonLd,
  PageHero,
  SchoolBands,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  SCHOOL_ADD_ONS,
  SCHOOL_STARTING_TERM_PRICE,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  serviceJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.schoolsPricing);

export default function SchoolsPricingPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          serviceJsonLd({
            name: "Corelith Schools",
            description: seoPages.schoolsPricing.description,
            path: "/home/pricing/schools",
            serviceType: "School management software",
            keywords: seoPages.schoolsPricing.keywords,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Pricing", path: "/home/pricing" },
            { name: "Schools", path: "/home/pricing/schools" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Schools pricing"
        title="Schools need a different buying path."
        copy={`Corelith Schools starts from ${formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term, then scales by enrolment, portal needs, implementation scope and institution complexity.`}
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Term bands"
          title="Start with enrolment and implementation scope."
          copy="Schools usually need annual or term-based planning, procurement steps, migration, staff training and portal rollout."
        />
        <SchoolBands />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="School add-ons"
            title="Add portals, boarding, reporting and finance depth when required."
            copy="School deployments are scoped around the institution, not squeezed into the same checkout path as a single-site retailer."
          />
          <div className={styles.tableFrame}>
            <table className={styles.table}>
              <caption className="sr-only">Corelith school add-ons</caption>
              <thead>
                <tr>
                  <th scope="col">Add-on</th>
                  <th scope="col">Price</th>
                  <th scope="col">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {SCHOOL_ADD_ONS.map((addOn) => (
                  <tr key={addOn.name}>
                    <th scope="row">{addOn.name}</th>
                    <td>{addOn.termPrice === null ? "Tailored" : `${formatUsd(addOn.termPrice)}/term`}</td>
                    <td>{addOn.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaBand
        title="Arrange a school consultation before a proposal."
        copy="A useful school conversation starts with enrolment, campuses, portals, fee structure, academic workflow and implementation timing."
        href="/home/book-demo?interest=schools"
        label="Arrange a school consultation"
      />
    </SiteChrome>
  );
}
