"use client";

import Link from "next/link";
import { useState } from "react";

import { ArrowRight, Check, Sparkles } from "@/lib/icons";
import {
  MARKETING_TIERS,
  TRIAL_DAYS,
  formatUsd,
  tierPriceFor,
  type BillingPeriod,
} from "@/lib/marketing/pricing";
import { Button } from "@/components/ui/button";
import styles from "@/components/marketing/marketing-site.module.css";

const MAX_ANNUAL_SAVING = Math.max(...MARKETING_TIERS.map((tier) => tier.annualSavings));

export function PricingPlans() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const annual = period === "annual";

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <div className={styles.billingToggle} role="group" aria-label="Billing period">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            aria-pressed={!annual}
            className={`${styles.billingToggleButton} ${!annual ? styles.billingToggleButtonActive : ""}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            aria-pressed={annual}
            className={`${styles.billingToggleButton} ${annual ? styles.billingToggleButtonActive : ""}`}
          >
            Yearly
            <span className={styles.billingToggleBadge}>2 months free</span>
          </button>
        </div>
        <p className="text-sm text-[#31436f]/72">
          {annual
            ? `Billed once a year. Save up to ${formatUsd(MAX_ANNUAL_SAVING)} a year.`
            : `Billed monthly. Switch to yearly and save up to ${formatUsd(MAX_ANNUAL_SAVING)}.`}
        </p>
      </div>

      <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {MARKETING_TIERS.map((tier) => {
          const price = tierPriceFor(tier, period);
          const featured = tier.isMostPopular;

          return (
            <article
              key={tier.code}
              className={`${styles.planCard} ${featured ? styles.planCardFeatured : ""}`}
            >
              {featured ? (
                <span className={styles.planBadge}>
                  <Sparkles className="size-3.5" />
                  Most popular
                </span>
              ) : null}

              <div className="flex flex-1 flex-col p-6">
                <p
                  className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                    featured ? "text-white/62" : "text-[#7383a9]"
                  }`}
                >
                  {tier.tagline}
                </p>
                <h3
                  className={`mt-2 text-2xl font-semibold tracking-[-0.035em] ${
                    featured ? "text-white" : "text-[#0b1945]"
                  }`}
                >
                  {tier.name}
                </h3>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span
                    className={`text-[2.6rem] font-bold leading-none tracking-[-0.05em] ${
                      featured ? "text-white" : "text-[#0b1945]"
                    }`}
                  >
                    {formatUsd(price)}
                  </span>
                  <span className={`text-sm ${featured ? "text-white/62" : "text-[#7383a9]"}`}>/mo</span>
                </div>

                <p className={`mt-1.5 min-h-[1.25rem] text-xs ${featured ? "text-[#ffd9c9]" : "text-[#c2410c]"}`}>
                  {annual
                    ? `Saves ${formatUsd(tier.annualSavings)} a year`
                    : tier.costAnchor}
                </p>

                <p className={`mt-4 text-sm leading-6 ${featured ? "text-white/78" : "text-[#31436f]/84"}`}>
                  {tier.bestFor}
                </p>

                <div className={`my-5 h-px ${featured ? "bg-white/14" : "bg-[#e2e8f6]"}`} />

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className={`text-xs ${featured ? "text-white/58" : "text-[#7383a9]"}`}>Sites</dt>
                    <dd className={`font-semibold ${featured ? "text-white" : "text-[#0f1f55]"}`}>
                      {tier.includedSites}
                    </dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${featured ? "text-white/58" : "text-[#7383a9]"}`}>People</dt>
                    <dd className={`font-semibold ${featured ? "text-white" : "text-[#0f1f55]"}`}>
                      {tier.includedUsers === null ? "Unlimited" : tier.includedUsers}
                    </dd>
                  </div>
                </dl>

                <ul className="mt-5 space-y-2.5">
                  {tier.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${featured ? "text-[#7cf0a8]" : "text-[#16a34a]"}`}
                      />
                      <span className={featured ? "text-white/82" : "text-[#31436f]/88"}>{highlight}</span>
                    </li>
                  ))}
                </ul>

                {tier.bundledAddOnValue > 0 ? (
                  <p
                    className={`mt-4 rounded-xl px-3 py-2 text-xs leading-5 ${
                      featured ? "bg-white/10 text-white/80" : "bg-[#f0f4ff] text-[#31436f]"
                    }`}
                  >
                    Includes {formatUsd(tier.bundledAddOnValue)}/mo of add-ons at no extra cost.
                  </p>
                ) : null}

                <div className="mt-auto pt-6">
                  <Button
                    asChild
                    size="lg"
                    className={`w-full rounded-full ${
                      featured
                        ? "bg-white text-[#091127] hover:bg-white/92 hover:text-[#091127]"
                        : "bg-[#0f1f55] text-white hover:bg-[#0f1f55]/90"
                    }`}
                  >
                    <Link href={tier.ctaHref}>
                      {tier.ctaLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <p
                    className={`mt-2.5 text-center text-xs ${
                      featured ? "text-white/58" : "text-[#7383a9]"
                    }`}
                  >
                    {tier.code === "ENTERPRISE"
                      ? "Custom terms available"
                      : `${TRIAL_DAYS}-day trial, no card`}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-[#31436f]/72">
        Every plan includes offline mode, mobile access, and all core operations. Extra sites from{" "}
        {formatUsd(Math.min(...MARKETING_TIERS.map((tier) => tier.additionalSiteMonthlyPrice)))}
        /mo.
      </p>
    </div>
  );
}
