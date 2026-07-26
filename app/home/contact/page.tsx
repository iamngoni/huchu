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
        copy="WhatsApp is first because that is where business actually happens here. Procurement, partnerships and larger rollouts still move through email and a formal proposal."
      />

      <section className={styles.section}>
        <SectionIntro
          eyebrow="Channels"
          title="Fast conversation first. Formal proposal when the scope is clear."
          copy="A good enquiry turns into a setup conversation quickly: business type, locations, current tools, the problem, how much data moves and when you want to go live."
        />
        <ContactChannelGrid />
      </section>

      <section className={styles.band}>
        <div className={styles.section}>
          <SectionIntro
            eyebrow="What to include"
            title="Useful context makes the first reply sharper."
            copy="Tell us what you sell or deliver, how many sites you run, what you use today, and where the money is leaking. That is enough for a straight answer."
          />
          <div className={styles.cardGrid3}>
            {["Business type and city", "Number of locations", "Current tools", "Main operating problem", "Go-live timing", "Preferred contact channel"].map((item) => (
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
