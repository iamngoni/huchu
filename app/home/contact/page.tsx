import type { Metadata } from "next";

import {
  ContactChannelGrid,
  CtaBand,
  JsonLd,
  PageHero,
  SectionIntro,
  SiteChrome,
} from "@/app/home/site-components";
import { seoPages } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  buildMarketingMetadata,
  organizationJsonLd,
} from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata(seoPages.contact);

export default function ContactPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/home" },
            { name: "Contact", path: "/home/contact" },
          ]),
        ]}
      />
      <PageHero
        eyebrow="Contact"
        title="Start in the channel that fits the sale."
        copy="WhatsApp is visible because it matters in Zimbabwe. Procurement, partnerships and larger rollouts can still move through email, calendar and formal proposal flow."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Channels"
          title="Fast conversation first. Formal proposal when the scope is clear."
          copy="A good enquiry should quickly become a setup conversation: industry, locations, current tools, pain, migration scope and go-live timing."
        />
        <ContactChannelGrid />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What to include"
            title="Useful context makes the first reply sharper."
            copy="Tell Corelith what you sell or manage, how many sites you run, which tools you use today and where the operational leakage is showing up."
          />
          <div className={styles.cardGrid3}>
            {["Industry and city", "Number of locations", "Current tools", "Main operating problem", "Go-live timing", "Preferred contact channel"].map((item) => (
              <article key={item} className={styles.compactCard}>
                <p className={styles.cardTitle}>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </SiteChrome>
  );
}
