import type { Metadata } from "next";
import Link from "next/link";

import {
  CtaBand,
  JsonLd,
  ModuleGrid,
  PageHero,
  PrimarySolutionNote,
  SectionIntro,
  SiteChrome,
  Workflow,
} from "@/app/home/site-components";
import { ProductPreview } from "@/app/home/product-preview";
import { coreModules, primarySolution, seoPages, solutions } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  softwareApplicationJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.platform);

export default function PlatformPage() {
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
        eyebrow="Corelith platform"
        title="Core Business Base plus the workflows your industry actually needs."
        copy="Corelith is not four unrelated products. It is one operating base with Sell, Stock, Books and People connected around the workflow that makes the buyer feel pain first."
      >
        <div className={styles.buttonRow}>
          <Link href="/home/book-demo" className={`${styles.button} ${styles.buttonPrimary}`}>
            Find your setup
          </Link>
          <Link href={`/home/solutions/${primarySolution.slug}`} className={styles.button}>
            Start with commerce
          </Link>
        </div>
      </PageHero>

      <section className={styles.section}>
        <ProductPreview />
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Core modules"
          title="The connection matters more than the feature list."
          copy="The buyer needs to see what happens when a sale, stock receipt, payment, job card or fee record moves through the whole system."
        />
        <ModuleGrid />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="Architecture"
            title="One platform, one primary pack, add depth when it pays for itself."
            copy="The commercial model is simple: Core Business Base is mandatory, then the customer starts with the industry pack that matches the first problem."
          />
          <div className={styles.cardGrid3}>
            {solutions.map((solution) => (
              <article key={solution.slug} className={styles.card}>
                <p className={styles.eyebrow}>{solution.strategicRole}</p>
                <h2 className={styles.cardTitle}>{solution.title}</h2>
                <p className={styles.body}>{solution.summary}</p>
                <div className={styles.tagList}>
                  {solution.modules.map((module) => (
                    <span key={module}>{module}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Example workflow"
          title="Commerce shows the launch logic most clearly."
          copy="This is the first demo path because the value is visible quickly: stock, sales, invoices, purchasing, payments and branch reporting."
        />
        <Workflow steps={primarySolution.workflow} />
        <PrimarySolutionNote />
      </section>

      <section className={styles.section}>
        <SectionIntro eyebrow="What each module owns" title="Clear boundaries keep the product understandable." />
        <div className={styles.tableFrame}>
          <table className={styles.table}>
            <caption className="sr-only">Corelith module responsibilities</caption>
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">Owns</th>
                <th scope="col">Connects into</th>
              </tr>
            </thead>
            <tbody>
              {coreModules.map((module) => (
                <tr key={module.name}>
                  <th scope="row">Corelith {module.name}</th>
                  <td>{module.copy}</td>
                  <td>{module.connection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
