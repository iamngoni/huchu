import { normalizeFeatureKey } from "@/lib/platform/gating/catalog-utils";
import { prisma } from "@/lib/prisma";
import { FEATURE_BUNDLES, FEATURE_CATALOG, TIERS, getBundleDefinition, getTierDefinition } from "@/lib/platform/feature-catalog";
import { getSubscriptionHealth } from "@/lib/platform/subscription";

export type FeatureMap = Record<string, boolean>;

export interface PricingLineItem {
  code: string;
  label: string;
  amount: number;
  type: "tier" | "site-overage" | "addon" | "addon-site" | "feature";
}

export interface CompanyPricingResult {
  companyId: string;
  planCode: string | null;
  planName: string | null;
  currency: string;
  siteCount: number;
  tierIncludedSites: number;
  tierSiteOverageRate: number;
  tierSiteOverageCount: number;
  tierSiteOverageAmount: number;
  baseAmount: number;
  addonBaseAmount: number;
  addonSiteAmount: number;
  addonAmount: number;
  featureAmount: number;
  totalAmount: number;
  lineItems: PricingLineItem[];
  computedAt: string;
}

function normalizeLegacyFeatureKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LEGACY_FEATURE_ALIAS_MAP = new Map<string, string>(
  FEATURE_CATALOG.map((feature) => [
    normalizeLegacyFeatureKey(feature.key),
    normalizeFeatureKey(feature.key),
  ]),
);

function resolveLegacyFeatureAlias(featureKey: string): string | null {
  if (featureKey.includes(".")) return null;
  const alias = LEGACY_FEATURE_ALIAS_MAP.get(featureKey);
  if (!alias || alias === featureKey) return null;
  return alias;
}

function money(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function resolveBundleMonthlyPrice(bundleCode: string, value: unknown): number {
  const normalized = money(value);
  if (normalized > 0) return normalized;
  return money(getBundleDefinition(bundleCode)?.monthlyPrice ?? 0);
}

function resolveBundleAdditionalSiteMonthlyPrice(bundleCode: string, value: unknown): number {
  const normalized = money(value);
  if (normalized > 0) return normalized;
  return money(getBundleDefinition(bundleCode)?.additionalSiteMonthlyPrice ?? 0);
}

function nowIso() {
  return new Date().toISOString();
}

async function getBundleFeatureSet(bundleCodes: string[]): Promise<Set<string>> {
  const normalizedCodes = [...new Set(bundleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  if (normalizedCodes.length === 0) return new Set<string>();

  const rows = await prisma.featureBundle.findMany({
    where: { code: { in: normalizedCodes } },
    select: { code: true, items: { select: { feature: { select: { key: true } } } } },
  });

  const set = new Set<string>();
  for (const code of normalizedCodes) {
    const systemBundle = FEATURE_BUNDLES.find((bundle) => bundle.code === code);
    if (systemBundle) {
      for (const key of systemBundle.features) set.add(normalizeFeatureKey(key));
      continue;
    }

    const row = rows.find((bundle) => bundle.code === code);
    for (const key of row?.items.map((item) => item.feature.key) ?? []) set.add(normalizeFeatureKey(key));
  }

  return set;
}

export async function syncEntitlementCatalog(): Promise<{
  features: number;
  bundles: number;
  bundleItems: number;
  tiers: number;
}> {
  return {
    features: FEATURE_CATALOG.length,
    bundles: FEATURE_BUNDLES.length,
    bundleItems: FEATURE_BUNDLES.reduce((sum, bundle) => sum + bundle.features.length, 0),
    tiers: TIERS.length,
  };
}

export async function getCompanyFeatureMap(companyId: string): Promise<FeatureMap> {
  const normalizedCompanyId = companyId.trim();
  if (!normalizedCompanyId) return {};

  const [dbFeatures, flags, latestSubscription, addons] = await Promise.all([
    prisma.platformFeature.findMany({
      where: { isActive: true },
      select: { key: true, defaultEnabled: true, isBillable: true },
    }),
    prisma.companyFeatureFlag.findMany({
      where: {
        companyId: normalizedCompanyId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        isEnabled: true,
        feature: { select: { key: true, isBillable: true } },
      },
    }),
    prisma.companySubscription.findFirst({
      where: { companyId: normalizedCompanyId },
      include: { plan: { select: { code: true } } },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.companySubscriptionAddon.findMany({
      where: { companyId: normalizedCompanyId, isEnabled: true },
      select: { bundle: { select: { code: true } } },
    }),
  ]);

  const map: FeatureMap = {};
  const featureMeta = new Map<string, { isBillable: boolean }>();
  const catalogByKey = new Map(FEATURE_CATALOG.map((feature) => [normalizeFeatureKey(feature.key), feature]));
  const features = [
    ...FEATURE_CATALOG.map((catalog) => ({
      key: catalog.key,
      defaultEnabled: catalog.defaultEnabled,
      isBillable: catalog.isBillable,
    })),
    ...dbFeatures.filter((feature) => !catalogByKey.has(normalizeFeatureKey(feature.key))),
  ];

  for (const feature of features) {
    const key = normalizeFeatureKey(feature.key);
    featureMeta.set(key, { isBillable: Boolean(feature.isBillable) });
    map[key] = feature.isBillable ? false : Boolean(feature.defaultEnabled);
  }

  const tier = getTierDefinition(latestSubscription?.plan?.code);
  const subscriptionEntitled = new Set<string>();
  if (tier) {
    for (const key of tier.includedFeatures) {
      const normalized = normalizeFeatureKey(key);
      subscriptionEntitled.add(normalized);
      map[normalized] = true;
    }
    const includedByTierBundles = await getBundleFeatureSet(tier.includedBundles);
    for (const key of includedByTierBundles) {
      subscriptionEntitled.add(key);
      map[normalizeFeatureKey(key)] = true;
    }
  }

  const addonCodes = addons.map((row) => row.bundle.code);
  const addonFeatures = await getBundleFeatureSet(addonCodes);
  for (const key of addonFeatures) {
    subscriptionEntitled.add(key);
    map[normalizeFeatureKey(key)] = true;
  }

  const explicitFlagKeys = new Set<string>();
  for (const flag of flags) {
    const normalizedFlagKey = normalizeFeatureKey(flag.feature.key);
    const requested = Boolean(flag.isEnabled);
    const isBillable = featureMeta.get(normalizedFlagKey)?.isBillable ?? Boolean(flag.feature.isBillable);
    map[normalizedFlagKey] = requested && (!isBillable || subscriptionEntitled.has(normalizedFlagKey));
    explicitFlagKeys.add(normalizedFlagKey);
  }

  // Backward compatibility for legacy keys written by old TUI normalization.
  // Apply alias only when the canonical key does not already have an explicit flag.
  for (const flag of flags) {
    const normalizedFlagKey = normalizeFeatureKey(flag.feature.key);
    const aliasKey = resolveLegacyFeatureAlias(normalizedFlagKey);
    if (aliasKey && !explicitFlagKeys.has(aliasKey)) {
      const requested = Boolean(flag.isEnabled);
      const isBillable = featureMeta.get(aliasKey)?.isBillable ?? Boolean(flag.feature.isBillable);
      map[aliasKey] = requested && (!isBillable || subscriptionEntitled.has(aliasKey));
    }
  }

  return map;
}

export async function getEnabledFeatureKeys(companyId: string): Promise<string[]> {
  const map = await getCompanyFeatureMap(companyId);
  return Object.keys(map)
    .filter((key) => map[key])
    .sort();
}

export async function computeCompanyPricing(companyId: string): Promise<CompanyPricingResult> {
  const normalizedCompanyId = companyId.trim();
  if (!normalizedCompanyId) {
    throw new Error("companyId is required.");
  }

  const subscription = await prisma.companySubscription.findFirst({
    where: { companyId: normalizedCompanyId },
    include: { plan: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const planCode = subscription?.plan?.code ?? null;
  const planName = subscription?.plan?.name ?? null;
  const currency = subscription?.plan?.currency ?? "USD";
  const tier = getTierDefinition(planCode);
  const siteCount = await prisma.site.count({
    where: { companyId: normalizedCompanyId, isActive: true },
  });
  const tierIncludedSites = Math.max(0, tier?.includedSites ?? 0);
  const tierSiteOverageRate = money(tier?.additionalSiteMonthlyPrice ?? 0);
  const tierSiteOverageCount = Math.max(0, siteCount - tierIncludedSites);
  const tierSiteOverageAmount = tierSiteOverageCount * tierSiteOverageRate;

  const baseAmount = money(subscription?.plan?.monthlyPrice ?? 0);
  const lineItems: PricingLineItem[] = [
    {
      code: planCode ?? "NO_PLAN",
      label: planName ?? "No Assigned Tier",
      amount: baseAmount,
      type: "tier",
    },
  ];
  if (tierSiteOverageAmount > 0) {
    lineItems.push({
      code: `${planCode ?? "NO_PLAN"}:SITE_OVERAGE`,
      label: `Tier site overage (${tierSiteOverageCount} x ${tierSiteOverageRate.toFixed(2)})`,
      amount: tierSiteOverageAmount,
      type: "site-overage",
    });
  }

  const enabledAddons = await prisma.companySubscriptionAddon.findMany({
    where: { companyId: normalizedCompanyId, isEnabled: true },
    include: { bundle: true },
    orderBy: [{ bundle: { code: "asc" } }],
  });

  let addonBaseAmount = 0;
  let addonSiteAmount = 0;
  for (const addon of enabledAddons) {
    const base = resolveBundleMonthlyPrice(addon.bundle.code, addon.bundle.monthlyPrice);
    const perSite = resolveBundleAdditionalSiteMonthlyPrice(
      addon.bundle.code,
      addon.bundle.additionalSiteMonthlyPrice,
    );
    const siteCharge = perSite * siteCount;
    addonBaseAmount += base;
    addonSiteAmount += siteCharge;
    lineItems.push({
      code: addon.bundle.code,
      label: addon.bundle.name,
      amount: base,
      type: "addon",
    });
    if (siteCharge > 0) {
      lineItems.push({
        code: `${addon.bundle.code}:SITE`,
        label: `${addon.bundle.name} site charge (${siteCount} x ${perSite.toFixed(2)})`,
        amount: siteCharge,
        type: "addon-site",
      });
    }
  }
  const addonAmount = addonBaseAmount + addonSiteAmount;

  const includedByTier = new Set<string>((tier?.includedFeatures ?? []).map(normalizeFeatureKey));
  const includedByTierBundle = await getBundleFeatureSet(tier?.includedBundles ?? []);
  for (const key of includedByTierBundle) includedByTier.add(key);

  const enabledAddonFeatureSet = await getBundleFeatureSet(enabledAddons.map((addon) => addon.bundle.code));
  for (const key of enabledAddonFeatureSet) {
    includedByTier.add(key);
  }

  const manualBillableFlags = await prisma.companyFeatureFlag.findMany({
    where: {
      companyId: normalizedCompanyId,
      isEnabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      feature: {
        select: { key: true, name: true, isBillable: true, monthlyPrice: true, isActive: true },
      },
    },
  });

  let featureAmount = 0;
  for (const row of manualBillableFlags) {
    const feature = row.feature;
    const key = normalizeFeatureKey(feature.key);
    if (!feature.isActive || !feature.isBillable || includedByTier.has(key)) continue;
    const amount = money(feature.monthlyPrice);
    if (amount <= 0) continue;
    featureAmount += amount;
    lineItems.push({
      code: feature.key,
      label: feature.name,
      amount,
      type: "feature",
    });
  }

  const totalAmount = baseAmount + tierSiteOverageAmount + addonAmount + featureAmount;
  return {
    companyId: normalizedCompanyId,
    planCode,
    planName,
    currency,
    siteCount,
    tierIncludedSites,
    tierSiteOverageRate,
    tierSiteOverageCount,
    tierSiteOverageAmount,
    baseAmount,
    addonBaseAmount,
    addonSiteAmount,
    addonAmount,
    featureAmount,
    totalAmount,
    lineItems,
    computedAt: nowIso(),
  };
}

export async function recomputeAndPersistCompanyPricing(companyId: string): Promise<{
  pricing: CompanyPricingResult;
  subscriptionHealth: Awaited<ReturnType<typeof getSubscriptionHealth>>;
}> {
  const pricing = await computeCompanyPricing(companyId);
  const subscriptionHealth = await getSubscriptionHealth(companyId);

  const subscription = await prisma.companySubscription.findFirst({
    where: { companyId: companyId.trim() },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true },
  });

  if (subscription) {
    await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: {
        effectiveMonthlyAmount: pricing.totalAmount,
        priceSnapshotJson: JSON.stringify(pricing),
        lastPriceComputedAt: new Date(),
      },
    });
  }

  return { pricing, subscriptionHealth };
}
