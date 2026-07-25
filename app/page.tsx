import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { JsonLd } from "@/components/marketing/json-ld";
import { LandingPage } from "@/components/marketing/landing-page";
import { getMarketingSiteConfig } from "@/lib/marketing-site";
import { STARTING_MONTHLY_PRICE, TRIAL_DAYS, formatUsd } from "@/lib/marketing/pricing";
import {
  buildMarketingMetadata,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/marketing/seo";
import {
  PLATFORM_BRAND_NAME,
  PLATFORM_MARKETING_HOME_DESCRIPTION,
} from "@/lib/platform/brand";
import { getHostHeaderFromRequestHeaders, getPlatformHostContext } from "@/lib/platform/tenant";
import { getComputedWorkspaceHomeHref } from "@/lib/workspaces";

export const metadata = {
  ...buildMarketingMetadata({
    title: PLATFORM_BRAND_NAME,
    description: `${PLATFORM_MARKETING_HOME_DESCRIPTION} Priced per site, never per user, from ${formatUsd(STARTING_MONTHLY_PRICE)}/month. Works offline. ${TRIAL_DAYS}-day free trial.`,
    path: "/",
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

/**
 * The site root. On the marketing domain this IS the landing page — it is the
 * URL customers type and link to, so it renders directly instead of redirecting
 * to /home, which would cost a hop and split link equity across two URLs.
 *
 * Tenant subdomains keep the original behaviour: their root is the workspace,
 * not a marketing page.
 */
export default async function RootPage() {
  const requestHeaders = await headers();
  const hostContext = getPlatformHostContext(getHostHeaderFromRequestHeaders(requestHeaders));
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect(
      getComputedWorkspaceHomeHref({
        role: session.user.role,
        enabledFeatures: session.user.enabledFeatures,
        workspaceProfile: session.user.workspaceProfile,
      }),
    );
  }

  // A signed-out visitor on a tenant workspace host wants to sign in, not read
  // marketing copy about a product their company already bought.
  if (hostContext.isTenantHost) {
    redirect("/login");
  }

  return (
    <>
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd()]} />
      <LandingPage config={getMarketingSiteConfig()} />
    </>
  );
}
