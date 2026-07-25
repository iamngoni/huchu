/**
 * Regression tests for workspace / feature resolution.
 *
 * The platform started as a gold-mine product and was later made modular.
 * These tests pin the boundary: mining-only surfaces (shift report, crew
 * attendance, plant report, gold intake) must never resolve into non-mining
 * workspaces — not from templates, not from bundles, and not from the
 * presentation layer (quick actions, sidebar, route gating) even when a
 * legacy tenant still carries leaked feature flags.
 */
import { describe, expect, it } from "vitest";

import {
  CLIENT_BUNDLE_TEMPLATES,
  getClientTemplateFeatureKeys,
  getClientTemplateWorkspaceProfile,
} from "@/lib/platform/client-templates";
import { FEATURE_BUNDLES, FEATURE_CATALOG } from "@/lib/platform/feature-catalog";
import { isKnownFeatureKey } from "@/lib/platform/gating/catalog-utils";
import { getAllRouteFeatureKeys, resolveFeatureKeyForPath } from "@/lib/platform/gating/route-registry";
import { getAllowedUserRolesForWorkspace } from "@/lib/platform/vertical-roles";
import { getPrimaryQuickActions } from "@/lib/primary-actions";
import { resolveWorkspaceVerticalProductBundle } from "@/lib/workspace-products";
import { getWorkspaceSidebarModel } from "@/lib/workspaces";

const MINE_DAILY_OPS_FEATURE_KEYS = [
  "ops.shift-report.submit",
  "ops.attendance.mark",
  "ops.plant-report.submit",
  "reports.shift",
  "reports.attendance",
  "reports.plant",
];

const MINING_PAGE_HREFS = ["/shift-report", "/attendance", "/plant-report"];

const MINING_TEMPLATE_CODES = new Set(["TEMPLATE_GOLD_MINE", "TEMPLATE_ALL_FEATURES"]);

function templateFeatures(code: string): string[] {
  return getClientTemplateFeatureKeys(code);
}

function isMiningHref(href: string): boolean {
  return MINING_PAGE_HREFS.includes(href) || href.startsWith("/gold");
}

describe("feature catalog bundles", () => {
  it("maps every route feature to a known catalog feature key", () => {
    const unknownRouteKeys = getAllRouteFeatureKeys().filter((key) => !isKnownFeatureKey(key));
    expect(unknownRouteKeys).toEqual([]);
  });

  it("keeps mining daily ops out of ADDON_OPERATIONS_CORE", () => {
    const operationsCore = FEATURE_BUNDLES.find((bundle) => bundle.code === "ADDON_OPERATIONS_CORE");
    expect(operationsCore).toBeDefined();
    for (const key of MINE_DAILY_OPS_FEATURE_KEYS) {
      expect(operationsCore?.features).not.toContain(key);
    }
  });

  it("collects mining daily ops in ADDON_MINE_DAILY_OPS", () => {
    const mineOps = FEATURE_BUNDLES.find((bundle) => bundle.code === "ADDON_MINE_DAILY_OPS");
    expect(mineOps?.features.slice().sort()).toEqual(MINE_DAILY_OPS_FEATURE_KEYS.slice().sort());
  });

  it("exposes CRM as a first-class add-on bundle", () => {
    expect(FEATURE_CATALOG.some((feature) => feature.key === "crm.customers")).toBe(true);

    const crm = FEATURE_BUNDLES.find((bundle) => bundle.code === "ADDON_CRM_SUITE");
    expect(crm).toBeDefined();
    expect(crm?.features).toContain("crm.customers");
  });

  it("keeps Retail Suite entitled to customer CRM", () => {
    const retail = FEATURE_BUNDLES.find((bundle) => bundle.code === "ADDON_RETAIL_SUITE");
    expect(retail?.features).toContain("crm.customers");
  });
});

describe("client templates", () => {
  const nonMiningTemplates = CLIENT_BUNDLE_TEMPLATES.filter(
    (template) => !MINING_TEMPLATE_CODES.has(template.code),
  );

  it.each(nonMiningTemplates.map((template) => [template.code] as const))(
    "%s grants no mining ops or gold features",
    (code) => {
      const keys = templateFeatures(code);
      for (const key of MINE_DAILY_OPS_FEATURE_KEYS) {
        expect(keys).not.toContain(key);
      }
      expect(keys.some((key) => key.startsWith("gold."))).toBe(false);
    },
  );

  it("TEMPLATE_GOLD_MINE still grants mining daily ops and gold features", () => {
    const keys = templateFeatures("TEMPLATE_GOLD_MINE");
    for (const key of MINE_DAILY_OPS_FEATURE_KEYS) {
      expect(keys).toContain(key);
    }
    expect(keys).toContain("gold.home");
  });

  it("resolves a workspace profile for every template", () => {
    for (const template of CLIENT_BUNDLE_TEMPLATES) {
      expect(getClientTemplateWorkspaceProfile(template.code)).not.toBeNull();
    }
  });
});

describe("vertical role registration", () => {
  it("registers CRM sales roles only when CRM features are enabled", () => {
    const generalRoles = getAllowedUserRolesForWorkspace({
      workspaceProfile: "GENERAL",
      enabledFeatures: [],
    });
    expect(generalRoles).not.toContain("SALES_EXEC");
    expect(generalRoles).not.toContain("SALES_REP");

    const crmRoles = getAllowedUserRolesForWorkspace({
      workspaceProfile: "GENERAL",
      enabledFeatures: ["crm.customers"],
    });
    expect(crmRoles).toContain("SALES_EXEC");
    expect(crmRoles).toContain("SALES_REP");
  });

  it("keeps Autos sales roles registered through the Autos profile", () => {
    expect(
      getAllowedUserRolesForWorkspace({
        workspaceProfile: "AUTOS",
        enabledFeatures: [],
      }),
    ).toContain("SALES_EXEC");
  });

});

describe("vertical product resolution", () => {
  it("resolves multi-site operations from the multi-site template features", () => {
    const bundle = resolveWorkspaceVerticalProductBundle({
      workspaceProfile: "GENERAL",
      enabledFeatures: templateFeatures("TEMPLATE_SMALL_BUSINESS_SECURITY_STOCK"),
    });
    expect(bundle.id).toBe("multi-site-operations");
  });

  it("resolves service workshop from the workshop template features", () => {
    const bundle = resolveWorkspaceVerticalProductBundle({
      workspaceProfile: "GENERAL",
      enabledFeatures: templateFeatures("TEMPLATE_TECH_WORKSHOP"),
    });
    expect(bundle.id).toBe("service-workshop");
  });

  it("resolves crm-sales from the CRM template features (before generic products)", () => {
    const bundle = resolveWorkspaceVerticalProductBundle({
      workspaceProfile: "GENERAL",
      enabledFeatures: templateFeatures("TEMPLATE_CRM"),
    });
    expect(bundle.id).toBe("crm-sales");
  });
});

describe("crm template", () => {
  it("grants crm.* and the accounting features it depends on, but no foreign verticals", () => {
    const keys = templateFeatures("TEMPLATE_CRM");
    expect(keys).toContain("crm.core");
    expect(keys).toContain("crm.documents");
    expect(keys).toContain("accounting.ar");
    for (const key of MINE_DAILY_OPS_FEATURE_KEYS) {
      expect(keys).not.toContain(key);
    }
    expect(keys.some((key) => key.startsWith("gold."))).toBe(false);
    expect(keys.some((key) => key.startsWith("scrap-metal."))).toBe(false);
    expect(keys).not.toContain("schools.core");
    expect(keys).not.toContain("autos.core");
    expect(keys).not.toContain("retail.core");
  });

  it("does not leak crm.* features into unrelated templates", () => {
    for (const code of ["TEMPLATE_CORE_STARTER", "TEMPLATE_SCHOOLS", "TEMPLATE_GOLD_MINE"]) {
      expect(templateFeatures(code).some((key) => key.startsWith("crm."))).toBe(false);
    }
  });

  it("limits retail CRM access to the shared customer directory", () => {
    expect(templateFeatures("TEMPLATE_RETAIL").filter((key) => key.startsWith("crm."))).toEqual([
      "crm.customers",
    ]);
  });
});

describe("primary quick actions", () => {
  const nonMiningCases: Array<[string, string | null]> = [
    ["TEMPLATE_SMALL_BUSINESS_SECURITY_STOCK", "GENERAL"],
    ["TEMPLATE_TECH_WORKSHOP", "GENERAL"],
    ["TEMPLATE_CORE_STARTER", "GENERAL"],
    ["TEMPLATE_SCHOOLS", "SCHOOLS"],
    ["TEMPLATE_CAR_SALES", "AUTOS"],
    ["TEMPLATE_RETAIL", "RETAIL"],
    ["TEMPLATE_SCRAP_METAL", "SCRAP_METAL"],
    ["TEMPLATE_CRM", "GENERAL"],
  ];

  it.each(nonMiningCases)("%s offers no mining quick actions", (code, profile) => {
    const actions = getPrimaryQuickActions({
      workspaceProfile: profile,
      role: "MANAGER",
      enabledFeatures: templateFeatures(code),
    });
    expect(actions.filter((action) => isMiningHref(action.href))).toEqual([]);
  });

  it("multi-site offers stores actions", () => {
    const actions = getPrimaryQuickActions({
      workspaceProfile: "GENERAL",
      role: "MANAGER",
      enabledFeatures: templateFeatures("TEMPLATE_SMALL_BUSINESS_SECURITY_STOCK"),
    });
    expect(actions.map((action) => action.href)).toContain("/stores/receive");
  });

  it("service workshop offers maintenance actions", () => {
    const actions = getPrimaryQuickActions({
      workspaceProfile: "GENERAL",
      role: "MANAGER",
      enabledFeatures: templateFeatures("TEMPLATE_TECH_WORKSHOP"),
    });
    expect(actions.map((action) => action.href)).toContain("/maintenance/breakdown");
  });

  it("gold mine keeps its mining quick actions", () => {
    const actions = getPrimaryQuickActions({
      workspaceProfile: "GOLD_MINE",
      role: "MANAGER",
      enabledFeatures: templateFeatures("TEMPLATE_GOLD_MINE"),
    });
    const hrefs = actions.map((action) => action.href);
    expect(hrefs).toContain("/shift-report");
    expect(hrefs).toContain("/gold/intake/pours/new");
  });

  it("legacy multi-site tenants with leaked mining flags still see no mining quick actions", () => {
    const leakedFeatures = [
      ...templateFeatures("TEMPLATE_SMALL_BUSINESS_SECURITY_STOCK"),
      ...MINE_DAILY_OPS_FEATURE_KEYS,
    ];
    const actions = getPrimaryQuickActions({
      workspaceProfile: "GENERAL",
      role: "MANAGER",
      enabledFeatures: leakedFeatures,
    });
    expect(actions.filter((action) => isMiningHref(action.href))).toEqual([]);
  });
});

describe("workspace sidebar model", () => {
  it("shows CRM navigation when only CRM customers is enabled", () => {
    const model = getWorkspaceSidebarModel({
      role: "MANAGER",
      enabledFeatures: ["crm.customers"],
      workspaceProfile: "GENERAL",
    });
    const hrefs = model.sections.flatMap((section) => section.items.map((item) => item.href));
    expect(hrefs).toContain("/retail/customers");
  });

  it("multi-site sidebar contains no mining hrefs anywhere", () => {
    const model = getWorkspaceSidebarModel({
      role: "MANAGER",
      enabledFeatures: templateFeatures("TEMPLATE_SMALL_BUSINESS_SECURITY_STOCK"),
      workspaceProfile: "GENERAL",
    });
    const hrefs = [
      ...model.quickActions.map((item) => item.href),
      ...model.sections.flatMap((section) => section.items.map((item) => item.href)),
    ];
    expect(hrefs.filter(isMiningHref)).toEqual([]);
    expect(model.homeHref.startsWith("/gold")).toBe(false);
  });

  it("schools sidebar contains no mining hrefs anywhere", () => {
    const model = getWorkspaceSidebarModel({
      role: "MANAGER",
      enabledFeatures: templateFeatures("TEMPLATE_SCHOOLS"),
      workspaceProfile: "SCHOOLS",
    });
    const hrefs = [
      ...model.quickActions.map((item) => item.href),
      ...model.sections.flatMap((section) => section.items.map((item) => item.href)),
    ];
    expect(hrefs.filter(isMiningHref)).toEqual([]);
  });
});

describe("route gating", () => {
  it("gates the production dashboard behind plant reporting", () => {
    expect(resolveFeatureKeyForPath("/dashboard")).toBe("reports.plant");
  });

  it("gates mining capture pages behind mining ops features", () => {
    expect(resolveFeatureKeyForPath("/shift-report")).toBe("ops.shift-report.submit");
    expect(resolveFeatureKeyForPath("/attendance")).toBe("ops.attendance.mark");
    expect(resolveFeatureKeyForPath("/plant-report")).toBe("ops.plant-report.submit");
  });

  it("gates moved preferences organization pages behind their source features", () => {
    expect(resolveFeatureKeyForPath("/preferences/organization/users")).toBe(
      "admin.user-management.directory",
    );
    expect(resolveFeatureKeyForPath("/preferences/organization/sites")).toBe(
      "admin.sites-sections",
    );
    expect(resolveFeatureKeyForPath("/preferences/organization/departments")).toBe(
      "hr.employees",
    );
    expect(resolveFeatureKeyForPath("/preferences/organization/branding/identity")).toBe(
      "core.branding.manage",
    );
    expect(resolveFeatureKeyForPath("/preferences/organization/templates")).toBe(
      "core.branding.manage",
    );
  });

  it("gates retail customer surfaces behind CRM", () => {
    expect(resolveFeatureKeyForPath("/retail/customers")).toBe("crm.customers");
    expect(resolveFeatureKeyForPath("/portal/pos/customers")).toBe("crm.customers");
    expect(resolveFeatureKeyForPath("/api/v2/retail/customers/search")).toBe("crm.customers");
  });
});
