import {
  CtaBand,
  HomeHero,
  JsonLd,
  LaunchSprintSection,
  ModulesSection,
  PricingPreviewSection,
  ProblemSection,
  ProofSection,
  SiteChrome,
  SolutionsSection,
  WorkflowProofSection,
} from "@/app/home/site-components";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/marketing/seo";

export function HomeMarketingPage() {
  return (
    <SiteChrome>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          softwareApplicationJsonLd(),
          breadcrumbJsonLd([{ name: "Home", path: "/home" }]),
        ]}
      />
      <HomeHero />
      <ProblemSection />
      <SolutionsSection />
      <WorkflowProofSection />
      <ModulesSection />
      <LaunchSprintSection />
      <PricingPreviewSection />
      <ProofSection />
      <CtaBand />
    </SiteChrome>
  );
}
