import type { Metadata } from "next";
import Link from "next/link";

import {
  CtaBand,
  FAQList,
  JsonLd,
  SchoolBands,
  SectionIntro,
  SiteChrome,
  Workflow,
} from "@/app/home/site-components";
import { schoolsTrack, seoPages, whatsappHref } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  MONTHS_PER_TERM,
  SCHOOL_ADD_ONS,
  SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM,
  SCHOOL_STARTING_TERM_PRICE,
  TERMS_PER_YEAR,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  faqJsonLd,
  serviceJsonLd,
} from "@/lib/marketing/seo";
import {
  ArrowRight,
  Check,
  ExternalLink,
  TriangleAlert,
} from "@/lib/icons";

export const metadata: Metadata = buildMarketingMetadata(seoPages.schools);

/**
 * Schools get their own page rather than a slot under `/home/solutions`.
 *
 * They do not run order-to-cash, they budget per term rather than per month,
 * and the decision goes through a board. Folding them into the main funnel
 * would blunt both stories, so the whole track — pitch, capabilities, pricing
 * and FAQ — lives here on one page a bursar can send to a committee.
 */
export default function SchoolsPage() {
  const SchoolsIcon = schoolsTrack.icon;

  return (
    <SiteChrome>
      <JsonLd
        data={[
          serviceJsonLd({
            name: "Corelith Schools",
            description: seoPages.schools.description,
            path: "/home/schools",
            serviceType: "School management software",
            keywords: seoPages.schools.keywords,
          }),
          faqJsonLd([...schoolsTrack.faqs]),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Schools", path: "/home/schools" },
          ]),
        ]}
      />

      <div className={styles.heroBackdrop}>
        <section className={styles.pageHero}>
          <div className={styles.pageHeroTitle}>
            <SchoolsIcon className={styles.heroIcon} weight="regular" />
            <p className={styles.eyebrow}>{schoolsTrack.eyebrow}</p>
            <h1 className={styles.display}>{schoolsTrack.headline}</h1>
          </div>
          <div className={styles.pageHeroAside}>
            <p className={styles.lead}>{schoolsTrack.summary}</p>
            <p className={styles.body}>{schoolsTrack.audience}</p>
            <div className={styles.buttonRow}>
              <Link
                href="/home/book-demo?interest=schools"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Arrange a school consultation
                <ArrowRight className={styles.icon} weight="regular" />
              </Link>
              <Link
                href={whatsappHref(schoolsTrack.whatsapp)}
                className={styles.button}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp us
                <ExternalLink className={styles.icon} weight="regular" />
              </Link>
            </div>
            <div className={styles.assuranceGrid}>
              <span>From {formatUsd(SCHOOL_STARTING_TERM_PRICE)}/term</span>
              <span>Unlimited staff accounts</span>
              <span>Data migration included in the rollout scope</span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Why schools are separate"
          title="A school does not run on invoices and stock. It runs on a term."
          copy="Everything about the buying decision is different: the money arrives three times a year, the decision goes through a board, and the records you keep are governed by the ministry rather than by ZIMRA. So the pricing, the rollout and this page are different too."
        />
        <div className={styles.cardGrid2}>
          {schoolsTrack.pains.map((pain) => (
            <article key={pain} className={styles.card}>
              <TriangleAlert className={styles.cardIcon} weight="regular" />
              <p className={styles.body}>{pain}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="The school year, end to end"
            title="One record from application to report card."
            copy="A student is admitted once. The bursar, the registrar, the class teacher and the parent then read the same record instead of keeping four copies of it."
          />
          <Workflow steps={[...schoolsTrack.workflow]} />
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="What is included"
          title="Everything a school office does, in one place."
          copy="Admissions through to results, with the finance side connected rather than bolted on afterwards."
        />
        <div className={styles.cardGrid3}>
          {schoolsTrack.capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <article key={capability.title} className={styles.card}>
                <Icon className={styles.cardIcon} weight="regular" />
                <h2 className={styles.cardTitle}>{capability.title}</h2>
                <p className={styles.body}>{capability.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Pricing lives on this page, not on /home/pricing ── */}
      <section className={styles.bandSunken} id="pricing">
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Schools pricing"
            title="Priced per campus, per term, against enrolment."
            copy={`Three terms a year, so each band covers roughly ${MONTHS_PER_TERM} months. Bands are flat: growing within your band never costs more, and every plan includes unlimited staff accounts.`}
          />
          <SchoolBands />

          <div className={`${styles.cardGrid2} ${styles.sectionFooter}`}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>What every band includes</h2>
              <ul className={styles.checkList}>
                {[
                  "Unlimited staff and teacher accounts",
                  "Every campus keeps its own registers and fee structure",
                  "Term and year-end reporting for the board",
                  "Offline-capable attendance and fee capture",
                  "Your data exported on request, at any time",
                ].map((item) => (
                  <li key={item}>
                    <Check className={styles.icon} weight="regular" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Over 1,500 students</h2>
              <p className={styles.body}>
                Group quotes are worked from an indicative{" "}
                {formatUsd(SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM * 100)} per 100 students per
                term, which keeps the per-student rate below the Premier band. Growing past a band
                should never cost a school more per head than staying inside it.
              </p>
              <p className={styles.body}>
                Billed {TERMS_PER_YEAR} times a year, in line with how fees actually come in.
              </p>
              <Link href="/home/book-demo?interest=schools" className={styles.inlineAction}>
                Request a group quote
                <ArrowRight className={styles.icon} weight="regular" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="School add-ons"
          title="Add transport, fiscalisation, branding or migration when you need them."
          copy="Priced per term alongside the band, except data migration, which is a single one-off charge at the start of the rollout."
        />
        <div className={styles.tableFrame}>
          <table className={styles.table}>
            <caption className="sr-only">Corelith school add-ons</caption>
            <thead>
              <tr>
                <th scope="col">Add-on</th>
                <th scope="col">Price</th>
                <th scope="col">What it adds</th>
              </tr>
            </thead>
            <tbody>
              {SCHOOL_ADD_ONS.map((addOn) => (
                <tr key={addOn.name}>
                  <th scope="row">{addOn.name}</th>
                  <td>{formatUsd(addOn.termPrice)}/term</td>
                  <td>{addOn.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What should change"
            title="What a first term on Corelith is supposed to fix."
            copy="We agree these with the head and the bursar before the rollout, then review them at the end of the first term."
          />
          <div className={styles.cardGrid2}>
            {schoolsTrack.outcomes.map((outcome) => (
              <article key={outcome} className={styles.compactCard}>
                <Check className={styles.cardIcon} weight="regular" />
                <p className={styles.cardTitle}>{outcome}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Questions from school leadership"
          title="The things a board asks before it approves anything."
        />
        <FAQList items={[...schoolsTrack.faqs]} />
      </section>

      <CtaBand
        eyebrow="Next step"
        title="Start with a consultation, not a checkout page."
        copy="Tell us enrolment, campuses, your fee structure, your current system and when in the school year you want to switch. We will come back with a scoped rollout plan your board can read."
        href="/home/book-demo?interest=schools"
        label="Arrange a school consultation"
      />
    </SiteChrome>
  );
}
