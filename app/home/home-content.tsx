import {
  CompetitiveEdgeGrid,
  CtaBand,
  DifferentiatorSection,
  FaqSection,
  HomeHero,
  JsonLd,
  LaunchSprintSection,
  LoopSection,
  ModulesSection,
  PricingPreviewSection,
  ProblemSection,
  ProofSection,
  SectionIntro,
  SegmentSection,
  SiteChrome,
} from "@/app/home/site-components";
import { faqs } from "@/app/home/site-data";
import styles from "@/app/home/marketing.module.css";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/marketing/seo";

/**
 * The landing page, in the order a cold visitor needs it:
 *
 *   who this is for and what it does  → hero, trust strip
 *   why it matters                    → the problem
 *   the one idea                      → the order-to-cash loop
 *   is this me?                       → segment switcher
 *   what do I actually get            → modules
 *   why not the cheaper option        → comparison and differentiators
 *   what does rollout look like       → Launch Sprint
 *   what does it cost                 → pricing preview
 *   why should I believe you          → honest proof framing
 *   what is still bothering me        → FAQ
 *   do the thing                      → CTA
 */
export function HomeMarketingPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          softwareApplicationJsonLd(),
          faqJsonLd(faqs.slice(0, 6)),
          breadcrumbJsonLd([{ name: "Home", path: "/home" }]),
        ]}
      />
      <HomeHero />
      <ProblemSection />
      <LoopSection />
      <SegmentSection />
      <ModulesSection />
      <DifferentiatorSection />

      <section className={`${styles.section} ${styles.reveal}`}>
        <SectionIntro
          eyebrow="What actually makes the difference"
          title="Six things that decide whether this works here."
          copy="Not feature counts. These are the constraints a system has to survive here, and the commercial terms that decide whether you can afford to put everyone on it."
        />
        <CompetitiveEdgeGrid />
      </section>

      <div className={styles.bandSunken}>
        <LaunchSprintSection />
      </div>

      <PricingPreviewSection />
      <ProofSection />
      <FaqSection />
      <CtaBand />
    </SiteChrome>
  );
}
