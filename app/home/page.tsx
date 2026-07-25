import { JsonLd } from "@/components/marketing/json-ld";
import { LandingPage } from "@/components/marketing/landing-page";
import { getMarketingSiteConfig } from "@/lib/marketing-site";
import { PLATFORM_BRAND_NAME, PLATFORM_MARKETING_HOME_DESCRIPTION } from "@/lib/platform/brand";
import {
  buildMarketingMetadata,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/marketing/seo";
import { STARTING_MONTHLY_PRICE, TRIAL_DAYS, formatUsd } from "@/lib/marketing/pricing";

export const metadata = {
  ...buildMarketingMetadata({
    title: PLATFORM_BRAND_NAME,
    description: `${PLATFORM_MARKETING_HOME_DESCRIPTION} Priced per site, never per user, from ${formatUsd(STARTING_MONTHLY_PRICE)}/month. Works offline. ${TRIAL_DAYS}-day free trial.`,
    path: "/home",
    keywords: [
      "business management software Zimbabwe",
      "ERP Zimbabwe",
      "POS system Zimbabwe",
      "stock control software Zimbabwe",
      "offline business software",
    ],
  }),
  title: { absolute: PLATFORM_BRAND_NAME },
};

export default function MarketingHomePage() {
  const config = getMarketingSiteConfig();

  return (
    <>
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd()]} />
      <LandingPage config={config} />
    </>
  );
}
