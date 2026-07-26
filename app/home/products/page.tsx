import type { Metadata } from "next";
import Link from "next/link";

import {
  CtaBand,
  FaqSection,
  JsonLd,
  ModuleGrid,
  PageHero,
  PlatformCapabilities,
  PrimarySegmentNote,
  SectionIntro,
  SegmentCards,
  SiteChrome,
  Workflow,
} from "@/app/home/site-components";
import { ProductPreview } from "@/app/home/product-preview";
import {
  ORDER_TO_CASH_LOOP,
  coreModules,
  primarySegment,
  seoPages,
} from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  MARKETING_TIERS,
  addOnsByCategory,
  formatUsd,
} from "@/lib/marketing/pricing";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  softwareApplicationJsonLd,
} from "@/lib/marketing/seo";
import { ArrowRight, Check } from "@/lib/icons";

export const metadata: Metadata = buildMarketingMetadata(seoPages.platform);

/** The cheapest plan that already bundles an add-on, for the "included from" note. */
function lowestTierIncluding(tierCodes: string[]): string | null {
  const tier = MARKETING_TIERS.find((candidate) => tierCodes.includes(candidate.code));
  return tier?.name ?? null;
}

export default function PlatformPage() {
  const groups = addOnsByCategory();

  return (
    <SiteChrome>
      <JsonLd
        data={[
          softwareApplicationJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Platform", path: "/home/products" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="The platform"
        title="Everything on Corelith, and how the parts hold together."
        copy="Five modules cover the whole order-to-cash loop. Industry packs shape the middle of it. Add-ons switch on depth when you need it — and nothing you turn on later needs a migration."
      >
        <div className={styles.buttonRow}>
          <Link href="/home/book-demo" className={`${styles.button} ${styles.buttonPrimary}`}>
            Find your setup
            <ArrowRight className={styles.icon} weight="regular" />
          </Link>
          <Link href="/home/pricing" className={styles.button}>
            See pricing
          </Link>
        </div>
      </PageHero>

      <section className={styles.section}>
        <ProductPreview />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="The five modules"
            title="One record, read five ways."
            copy="A sale is not copied into stock and then into the ledger. It is written once and everything else reads the same fact, which is why the numbers cannot drift apart."
          />
          <ModuleGrid />
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="How the modules meet"
          title="Follow one order all the way through."
          copy="This is the loop the whole platform is built around. Every module has a job in it, and the handovers happen without anyone re-typing anything."
        />
        <Workflow steps={ORDER_TO_CASH_LOOP.map((step) => step.step)} />

        <div className={`${styles.tableFrame} ${styles.sectionFooter}`}>
          <table className={styles.table}>
            <caption className="sr-only">What each Corelith module owns and connects into</caption>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">What it owns</th>
                <th scope="col">What it changes elsewhere</th>
              </tr>
            </thead>
            <tbody>
              {coreModules.map((module) => (
                <tr key={module.name}>
                  <th scope="row">{module.name}</th>
                  <td>{module.copy}</td>
                  <td>{module.connection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.bandSunken}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Platform capabilities"
            title="What is true of every module, on every plan."
            copy="These are not features you buy. They are properties of the platform, and they decide whether the system survives a normal week here."
          />
          <PlatformCapabilities />
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Industry packs"
          title="The middle of the loop, already configured."
          copy="Each pack changes the deliver step and the vocabulary around it. You start with one; adding another later is a setting, not a project."
        />
        <SegmentCards />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Add-ons"
            title="Depth you switch on when it pays for itself."
            copy="Every add-on is priced per month and listed openly. Several are already bundled into the higher plans, and the plan comparison on the pricing page shows which."
          />

          {groups.map((group) => {
            return (
              <div key={group.category} className={styles.sectionFooter}>
                <p className={styles.eyebrow}>{group.category}</p>
                <div className={`${styles.cardGrid3} ${styles.sectionFooter}`}>
                  {group.addOns.map((addOn) => {
                    const bundledFrom = lowestTierIncluding(addOn.includedInTiers);

                    return (
                      <article key={addOn.code} className={styles.compactCard}>
                        <div className={styles.cardTopline}>
                          <h3 className={styles.cardTitle}>{addOn.name}</h3>
                          <span>{formatUsd(addOn.monthlyPrice)}/mo</span>
                        </div>
                        <p className={styles.body}>{addOn.description}</p>
                        <p className={styles.small}>
                          {bundledFrom
                            ? `Already included from ${bundledFrom} upwards`
                            : `${addOn.featureCount} features`}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Where to start"
          title="You do not switch everything on in week one."
          copy="Pick the module that is costing you money this month. The rest sits ready, and turning it on later does not disturb what is already running."
        />
        <div className={styles.problemGrid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>A sensible first rollout</h2>
            <ul className={styles.checkList}>
              {[
                "Core platform, users, roles and your sites",
                "The one industry pack that matches your deliver step",
                "Stock or job cards — whichever is bleeding",
                "Invoicing and receipts, fiscalised where you need it",
                "The two or three reports the owner actually opens",
              ].map((item) => (
                <li key={item}>
                  <Check className={styles.icon} weight="regular" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <PrimarySegmentNote />
        </div>
      </section>

      <FaqSection
        eyebrow="Platform questions"
        title="What people ask once they have seen the modules."
        copy="If something here is a dealbreaker, it is better to find out now than three weeks into a rollout."
      />

      <CtaBand
        title={`See the platform on a ${primarySegment.title.toLowerCase().replace(/s$/, "")} workflow, or on yours.`}
      />
    </SiteChrome>
  );
}
