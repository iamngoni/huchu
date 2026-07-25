import Link from "next/link";

import { ArrowRight, Check } from "@/lib/icons";
import { TRIAL_DAYS, formatUsd, getProductPricing } from "@/lib/marketing/pricing";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

type ProductPricingPanelProps = {
  /** Slug of the product, matching `PRODUCT_COMMERCIALS`. */
  slug: string;
  productName: string;
};

/**
 * Per-product pricing block. Numbers come from the shared pricing model, so a
 * product page can never quote a figure the pricing page disagrees with.
 * Products priced bespokely (schools) route to their own pricing page instead
 * of showing a monthly figure.
 */
export function ProductPricingPanel({ slug, productName }: ProductPricingPanelProps) {
  const pricing = getProductPricing(slug);

  if (!pricing) {
    return (
      <div className={styles.pricingHintBox}>
        <p className="text-sm leading-7 text-[#31436f]/90">
          Pricing for {productName} is quoted to your setup.
        </p>
        <Button asChild className="mt-4 rounded-full bg-[#0f1f55] text-white hover:bg-[#1a2d6b]">
          <Link href="/home/book-demo">
            Talk to sales
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const bespoke = pricing.pricingModel === "bespoke";

  return (
    <div className={styles.pricingHintBox}>
      {bespoke ? (
        <>
          <span className="inline-flex rounded-full bg-[#ff6b35] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Priced per term
          </span>
          <p className="mt-4 text-sm leading-7 text-[#31436f]/90">
            {productName} is priced per term against enrolment, not per month — because that is how
            schools budget. Staff accounts are unlimited on every band.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[2.4rem] font-bold leading-none tracking-[-0.05em] text-[#0b1945]">
              {formatUsd(pricing.startingMonthly ?? 0)}
            </span>
            <span className="text-sm text-[#7383a9]">/month to start</span>
          </div>

          <p className="mt-3 text-sm leading-7 text-[#31436f]/90">
            That is the {pricing.entryTierName} plan plus the modules {productName.toLowerCase()} needs.
            Most teams running this at scale land around{" "}
            <strong>{formatUsd(pricing.typicalMonthly ?? 0)}/month</strong> on the{" "}
            {pricing.recommendedTierName} plan.
          </p>

          {pricing.requiredAddOns.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {pricing.requiredAddOns.map((addOn) => (
                <li key={addOn.code} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#16a34a]" />
                  <span className="text-[#31436f]/88">
                    <strong className="font-semibold text-[#0f1f55]">{addOn.name}</strong> —{" "}
                    {formatUsd(addOn.monthlyPrice)}/mo
                    {addOn.additionalSiteMonthlyPrice > 0
                      ? ` + ${formatUsd(addOn.additionalSiteMonthlyPrice)} per extra site`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-[#7383a9]">
            Priced per site, never per user. {TRIAL_DAYS}-day free trial, no credit card.
          </p>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#0f1f55] text-white hover:bg-[#1a2d6b]">
          <Link href={`/home/book-demo?product=${slug}`}>
            {bespoke ? "Get a school quote" : `Start ${TRIAL_DAYS}-day free trial`}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-[#d6def5] bg-white text-[#0b1945] hover:bg-[#f6f8ff]"
        >
          <Link href={pricing.pricingHref}>
            {bespoke ? "See enrolment bands" : "View full pricing"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
