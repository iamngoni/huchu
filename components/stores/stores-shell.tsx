"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageActions } from "@/components/layout/page-actions";
import { PageHeading } from "@/components/layout/page-heading";
import { SectionTab, SectionTabs } from "@/components/ui/section-tabs";
import { filterHrefItemsByEnabledFeatures } from "@/lib/platform/gating/nav-filter";
import { Fuel, History, Home, Minus, Package, Plus } from "@/lib/icons";
import type { LucideIcon } from "@/lib/icons";
import { getWorkspaceModulePresentation } from "@/lib/workspace-products";
import { resolveVerticalDefaults } from "@/lib/platform/vertical-defaults";

export type StoresTab =
  | "dashboard"
  | "inventory"
  | "movements"
  | "fuel"
  | "issue"
  | "receive";

type StoresTabItem = {
  id: StoresTab;
  label: string;
  href: string;
  icon: LucideIcon;
};

const storesTabs: StoresTabItem[] = [
  { id: "dashboard", label: "Overview", href: "/stores/dashboard", icon: Home },
  { id: "inventory", label: "Stock on Hand", href: "/stores/inventory", icon: Package },
  { id: "movements", label: "Movements", href: "/stores/movements", icon: History },
  { id: "fuel", label: "Fuel Ledger", href: "/stores/fuel", icon: Fuel },
  { id: "issue", label: "Issue Stock", href: "/stores/issue", icon: Minus },
  { id: "receive", label: "Receive Stock", href: "/stores/receive", icon: Plus },
];

type StoresShellProps = {
  activeTab: StoresTab;
  actions?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function StoresShell({
  activeTab,
  actions,
  children,
  title,
  description,
}: StoresShellProps) {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const siteId = searchParams.get("siteId");
  const enabledFeatures = useMemo(
    () => (session?.user as { enabledFeatures?: string[] } | undefined)?.enabledFeatures,
    [session],
  );
  const workspaceProfile = (session?.user as { workspaceProfile?: string } | undefined)?.workspaceProfile;
  const verticalDefaults = useMemo(
    () =>
      resolveVerticalDefaults({
        workspaceProfile,
        enabledFeatures,
      }),
    [enabledFeatures, workspaceProfile],
  );
  const modulePresentation = useMemo(
    () =>
      getWorkspaceModulePresentation({
        moduleId: "stores",
        enabledFeatures,
        workspaceProfile,
      }),
    [enabledFeatures, workspaceProfile],
  );
  const visibleTabs = useMemo(
    () =>
      filterHrefItemsByEnabledFeatures(
        storesTabs.filter((tab) => tab.id !== "fuel" || verticalDefaults.stores.allowFuel),
        enabledFeatures,
      ),
    [enabledFeatures, verticalDefaults.stores.allowFuel],
  );

  const buildHref = (href: string) => {
    if (!siteId) return href;
    const params = new URLSearchParams();
    params.set("siteId", siteId);
    return `${href}?${params.toString()}`;
  };

  return (
    <div className="w-full space-y-6">
      {actions ? <PageActions>{actions}</PageActions> : null}
      <PageHeading
        title={title ?? modulePresentation.title}
        className="mb-4"
      />

      <SectionTabs label="Stores navigation">
        {visibleTabs.map((tab) => (
          <SectionTab
            key={tab.id}
            to={buildHref(tab.href)}
            active={activeTab === tab.id}
            icon={<tab.icon aria-hidden="true" />}
          >
            {modulePresentation.tabLabels?.[tab.id] ?? tab.label}
          </SectionTab>
        ))}
      </SectionTabs>

      {children}
    </div>
  );
}
