import { describe, expect, it } from "vitest";

import {
  ANNUAL_BILLING_MONTHS,
  FEATURE_BUNDLES,
  TIERS,
  getBundleDefinition,
} from "@/lib/platform/feature-catalog";
import {
  MARKETING_ADD_ONS,
  MARKETING_TIERS,
  MONTHS_PER_TERM,
  PRODUCT_COMMERCIALS,
  SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM,
  SCHOOL_PRICING_BANDS,
  TIER_COMPARISON_ROWS,
  buildQuote,
  buildSchoolQuote,
  getAddOn,
  getProductPricing,
  schoolBandForEnrolment,
  startingPriceFor,
} from "@/lib/marketing/pricing";

const bundleCodes = new Set(FEATURE_BUNDLES.map((bundle) => bundle.code));

describe("tier ladder", () => {
  it("exposes a marketing tier for every billable tier", () => {
    expect(MARKETING_TIERS).toHaveLength(TIERS.length);
    expect(MARKETING_TIERS.map((tier) => tier.code)).toEqual(TIERS.map((tier) => tier.code));
  });

  it("prices ascend across the ladder", () => {
    const prices = MARKETING_TIERS.map((tier) => tier.monthlyPrice);
    const ascending = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(ascending);
    expect(new Set(prices).size).toBe(prices.length);
  });

  it("includes more sites at every step up", () => {
    const sites = MARKETING_TIERS.map((tier) => tier.includedSites);
    expect(sites).toEqual([...sites].sort((a, b) => a - b));
  });

  it("discounts annual billing by exactly two months", () => {
    for (const tier of TIERS) {
      const expected = Math.round((tier.monthlyPrice * ANNUAL_BILLING_MONTHS) / 12);
      // Published annual prices are rounded to whole dollars for readability.
      expect(Math.abs(tier.annualMonthlyPrice - expected)).toBeLessThanOrEqual(1);
      expect(tier.annualMonthlyPrice).toBeLessThan(tier.monthlyPrice);
    }
  });

  it("only bundles add-ons that exist", () => {
    for (const tier of TIERS) {
      for (const code of tier.includedBundles) {
        expect(bundleCodes.has(code), `${tier.code} bundles unknown add-on ${code}`).toBe(true);
      }
    }
  });

  it("never removes a bundled add-on when moving up a tier", () => {
    for (let index = 1; index < TIERS.length; index += 1) {
      const lower = new Set(TIERS[index - 1].includedBundles);
      const higher = new Set(TIERS[index].includedBundles);
      for (const code of lower) {
        expect(higher.has(code), `${TIERS[index].code} drops ${code}`).toBe(true);
      }
    }
  });

  it("bundles more add-on value at each step up", () => {
    const values = MARKETING_TIERS.map((tier) => tier.bundledAddOnValue);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("marks exactly one tier as most popular", () => {
    expect(MARKETING_TIERS.filter((tier) => tier.isMostPopular)).toHaveLength(1);
  });
});

describe("add-on catalog", () => {
  it("only lists add-ons that cost money", () => {
    for (const addOn of MARKETING_ADD_ONS) {
      expect(addOn.monthlyPrice + addOn.additionalSiteMonthlyPrice).toBeGreaterThan(0);
    }
  });

  it("reports the tiers that bundle each add-on", () => {
    for (const addOn of MARKETING_ADD_ONS) {
      for (const tierCode of addOn.includedInTiers) {
        const tier = TIERS.find((entry) => entry.code === tierCode);
        expect(tier?.includedBundles).toContain(addOn.code);
      }
    }
  });
});

describe("quotes", () => {
  it("charges the base price for a single-site entry plan", () => {
    const quote = buildQuote({
      tierCode: "BASIC",
      addOnCodes: [],
      sites: 1,
      users: 1,
      period: "monthly",
    });

    expect(quote.monthlyTotal).toBe(TIERS[0].monthlyPrice);
  });

  it("bills extra sites beyond the tier allowance", () => {
    const tier = TIERS[0];
    const quote = buildQuote({
      tierCode: tier.code,
      addOnCodes: [],
      sites: tier.includedSites + 2,
      users: 1,
      period: "monthly",
    });

    expect(quote.monthlyTotal).toBe(tier.monthlyPrice + 2 * tier.additionalSiteMonthlyPrice);
  });

  it("does not charge for an add-on the tier already bundles", () => {
    const scale = TIERS.find((tier) => tier.code === "MEDIUM");
    const bundled = scale?.includedBundles.find((code) => (getBundleDefinition(code)?.monthlyPrice ?? 0) > 0);
    expect(bundled).toBeDefined();

    const quote = buildQuote({
      tierCode: "MEDIUM",
      addOnCodes: [bundled as string],
      sites: 1,
      users: 1,
      period: "monthly",
    });

    expect(quote.monthlyTotal).toBe(scale?.monthlyPrice);
    expect(quote.lines.find((line) => line.label === getAddOn(bundled as string)?.name)?.monthly).toBe(0);
  });

  it("charges an add-on the tier does not bundle", () => {
    const addOn = getAddOn("ADDON_CCTV_SUITE");
    expect(addOn).not.toBeNull();

    const quote = buildQuote({
      tierCode: "BASIC",
      addOnCodes: ["ADDON_CCTV_SUITE"],
      sites: 1,
      users: 1,
      period: "monthly",
    });

    expect(quote.monthlyTotal).toBe(TIERS[0].monthlyPrice + (addOn?.monthlyPrice ?? 0));
  });

  it("quotes annual billing below monthly billing", () => {
    const input = { tierCode: "STANDARD", addOnCodes: [] as string[], sites: 2, users: 8 };
    const monthly = buildQuote({ ...input, period: "monthly" });
    const annual = buildQuote({ ...input, period: "annual" });

    expect(annual.monthlyTotal).toBeLessThan(monthly.monthlyTotal);
    expect(monthly.annualSavings).toBeGreaterThan(0);
  });

  it("falls back to the entry tier for an unknown plan code", () => {
    const quote = buildQuote({
      tierCode: "NOT_A_TIER",
      addOnCodes: [],
      sites: 1,
      users: 1,
      period: "monthly",
    });

    expect(quote.tier.code).toBe(TIERS[0].code);
  });
});

describe("starting prices", () => {
  it("ignores add-ons the entry tier already bundles", () => {
    const bundled = TIERS[0].includedBundles[0];
    expect(startingPriceFor([bundled])).toBe(TIERS[0].monthlyPrice);
  });

  it("adds the price of add-ons the entry tier does not bundle", () => {
    expect(startingPriceFor(["ADDON_CCTV_SUITE"])).toBe(
      TIERS[0].monthlyPrice + (getBundleDefinition("ADDON_CCTV_SUITE")?.monthlyPrice ?? 0),
    );
  });
});

describe("product catalog", () => {
  it("has unique slugs", () => {
    const slugs = PRODUCT_COMMERCIALS.map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only references add-ons that exist", () => {
    for (const product of PRODUCT_COMMERCIALS) {
      for (const code of [...product.requiredAddOnCodes, ...product.recommendedAddOnCodes]) {
        expect(bundleCodes.has(code), `${product.slug} references unknown add-on ${code}`).toBe(true);
      }
    }
  });

  it("recommends a real tier", () => {
    for (const product of PRODUCT_COMMERCIALS) {
      expect(TIERS.some((tier) => tier.code === product.recommendedTierCode)).toBe(true);
    }
  });

  it("quotes a starting price for every subscription product", () => {
    for (const product of PRODUCT_COMMERCIALS.filter((entry) => entry.pricingModel === "subscription")) {
      const pricing = getProductPricing(product.slug);
      expect(pricing?.startingMonthly).toBeGreaterThanOrEqual(TIERS[0].monthlyPrice);
      expect(pricing?.typicalMonthly).toBeGreaterThanOrEqual(pricing?.startingMonthly ?? 0);
    }
  });

  it("sends bespoke products to their own pricing page", () => {
    for (const product of PRODUCT_COMMERCIALS.filter((entry) => entry.pricingModel === "bespoke")) {
      const pricing = getProductPricing(product.slug);
      expect(pricing?.startingMonthly).toBeNull();
      expect(product.pricingHref).not.toBe("/home/pricing");
    }
  });
});

describe("school pricing", () => {
  it("ascends in price and enrolment", () => {
    const priced = SCHOOL_PRICING_BANDS.filter((band) => band.termPrice !== null);
    const prices = priced.map((band) => band.termPrice as number);
    const caps = priced.map((band) => band.maxStudents as number);

    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(caps).toEqual([...caps].sort((a, b) => a - b));
  });

  it("ends with a single quoted band", () => {
    const custom = SCHOOL_PRICING_BANDS.filter((band) => band.termPrice === null);
    expect(custom).toHaveLength(1);
    expect(SCHOOL_PRICING_BANDS.at(-1)?.termPrice).toBeNull();
  });

  it("marks exactly one band as most popular", () => {
    expect(SCHOOL_PRICING_BANDS.filter((band) => band.isMostPopular)).toHaveLength(1);
  });

  it("places enrolment in the right band at the boundaries", () => {
    expect(schoolBandForEnrolment(1).code).toBe("COMMUNITY");
    expect(schoolBandForEnrolment(300).code).toBe("COMMUNITY");
    expect(schoolBandForEnrolment(301).code).toBe("STANDARD");
    expect(schoolBandForEnrolment(800).code).toBe("STANDARD");
    expect(schoolBandForEnrolment(801).code).toBe("PREMIER");
    expect(schoolBandForEnrolment(1500).code).toBe("PREMIER");
    expect(schoolBandForEnrolment(1501).code).toBe("GROUP");
  });

  it("quotes a band price with no overage inside the band", () => {
    const quote = buildSchoolQuote(250);
    expect(quote.isCustom).toBe(false);
    expect(quote.termTotal).toBe(249);
    expect(quote.monthlyEquivalent).toBeCloseTo(249 / MONTHS_PER_TERM, 5);
  });

  it("never charges overage inside a band", () => {
    // 300 sits exactly on the Community ceiling, so the price is the band price.
    expect(buildSchoolQuote(300).termTotal).toBe(249);
    // 301 rolls into the next band rather than adding overage to Community.
    expect(buildSchoolQuote(301).termTotal).toBe(549);
  });

  it("quotes rather than prices enrolment above the top band", () => {
    const quote = buildSchoolQuote(1400);
    expect(quote.band.code).toBe("PREMIER");
    expect(quote.termTotal).toBe(949);

    const overBand = buildSchoolQuote(1501);
    expect(overBand.isCustom).toBe(true);
    expect(overBand.termTotal).toBeNull();
    expect(overBand.monthlyEquivalent).toBeNull();
  });

  it("gets cheaper per student as enrolment grows", () => {
    const small = buildSchoolQuote(300).perStudentPerTerm as number;
    const medium = buildSchoolQuote(800).perStudentPerTerm as number;
    const large = buildSchoolQuote(1500).perStudentPerTerm as number;

    expect(medium).toBeLessThan(small);
    expect(large).toBeLessThan(medium);
  });

  it("never makes growing past the top band cost more per student", () => {
    // A Group quote has to beat the rate a school already gets at the Premier
    // ceiling, otherwise the pricing punishes exactly the schools we want most.
    const premier = SCHOOL_PRICING_BANDS.find((band) => band.code === "PREMIER");
    const premierRate = (premier?.termPrice as number) / (premier?.maxStudents as number);
    expect(SCHOOL_GROUP_INDICATIVE_PER_STUDENT_PER_TERM).toBeLessThan(premierRate);
  });

  it("never charges more per student than the band below it", () => {
    const priced = SCHOOL_PRICING_BANDS.filter((band) => band.termPrice !== null);
    const rates = priced.map((band) => (band.termPrice as number) / (band.maxStudents as number));
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
  });

  it("reconciles the schools add-on list price with the mid enrolment band", () => {
    const suite = getBundleDefinition("ADDON_SCHOOLS_SUITE");
    const midBand = SCHOOL_PRICING_BANDS.find((band) => band.code === "STANDARD");
    const bandMonthly = (midBand?.termPrice as number) / MONTHS_PER_TERM;

    expect(suite).not.toBeNull();
    // The catalog price is the monthly equivalent of the mid band, so a school
    // provisioned from the platform console is not quoted a different number.
    expect(Math.abs((suite?.monthlyPrice ?? 0) - bandMonthly) / bandMonthly).toBeLessThan(0.15);
  });
});

describe("comparison table", () => {
  it("has one value per tier in every row", () => {
    for (const row of TIER_COMPARISON_ROWS) {
      expect(row.values, `row "${row.label}" has the wrong column count`).toHaveLength(
        MARKETING_TIERS.length,
      );
    }
  });
});
