"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { PageActions } from "@/components/layout/page-actions";
import { PageHeading } from "@/components/layout/page-heading";
import { NavRail, NavRailItem } from "@/components/ui/nav-rail";
import { SectionTab, SectionTabs } from "@/components/ui/section-tabs";
import { filterHrefItemsByEnabledFeatures } from "@/lib/platform/gating/nav-filter";
import {
  HR_CATEGORIES,
  HR_TABS,
  type HrCategoryId,
  type HrTab,
} from "@/lib/hr/tab-config";
import { getNavSectionsForRole } from "@/lib/navigation";
import { getWorkspaceModulePresentation } from "@/lib/workspace-products";

type HrShellProps = {
  activeTab: HrTab;
  actions?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function HrShell({
  activeTab,
  actions,
  children,
  title,
}: HrShellProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const enabledFeatures = useMemo(
    () =>
      (session?.user as { enabledFeatures?: string[] } | undefined)
        ?.enabledFeatures,
    [session],
  );
  const workspaceProfile = (
    session?.user as { workspaceProfile?: string } | undefined
  )?.workspaceProfile;
  const modulePresentation = useMemo(
    () =>
      getWorkspaceModulePresentation({
        moduleId: "hr",
        enabledFeatures,
        workspaceProfile,
      }),
    [enabledFeatures, workspaceProfile],
  );
  const visibleTabs = useMemo(() => {
    const hrSection = getNavSectionsForRole(role).find(
      (section) => section.id === "hr",
    );
    const visibleHrefs = new Set(
      filterHrefItemsByEnabledFeatures(
        hrSection?.items ?? [],
        enabledFeatures,
      ).map((item) => item.href),
    );
    return HR_TABS.filter((tab) => visibleHrefs.has(tab.href));
  }, [enabledFeatures, role]);

  const activeCategoryId = useMemo<HrCategoryId>(() => {
    const active = visibleTabs.find((tab) => tab.id === activeTab);
    return active?.categoryId ?? visibleTabs[0]?.categoryId ?? "people";
  }, [activeTab, visibleTabs]);

  const visibleCategories = useMemo(
    () =>
      HR_CATEGORIES.filter((category) =>
        visibleTabs.some((tab) => tab.categoryId === category.id),
      ).sort((a, b) => a.order - b.order),
    [visibleTabs],
  );

  const visibleTabsForActiveCategory = useMemo(
    () => visibleTabs.filter((tab) => tab.categoryId === activeCategoryId),
    [activeCategoryId, visibleTabs],
  );

  return (
    <div className="container mx-auto w-full space-y-4">
      {actions ? <PageActions>{actions}</PageActions> : null}
      <PageHeading
        title={title ?? modulePresentation.title}
        className="mb-2"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
        <NavRail
          label="Human resources category navigation"
          orientation="responsive"
          className="lg:w-[var(--rail-w)] lg:shrink-0"
        >
          {visibleCategories.map((category) => {
            const categoryTab = visibleTabs.find(
              (tab) => tab.categoryId === category.id,
            );
            if (!categoryTab) return null;
            return (
              <NavRailItem
                key={category.id}
                to={categoryTab.href}
                active={activeCategoryId === category.id}
                icon={<category.icon className="size-4" aria-hidden="true" />}
              >
                {category.label}
              </NavRailItem>
            );
          })}
        </NavRail>

        <div className="min-w-0 flex-1 space-y-5">
          {visibleTabsForActiveCategory.length > 1 && (
            <SectionTabs label="Human resources section navigation">
              {visibleTabsForActiveCategory.map((tab) => (
                <SectionTab
                  key={tab.id}
                  to={tab.href}
                  active={activeTab === tab.id}
                  icon={<tab.icon aria-hidden="true" />}
                >
                  {tab.label}
                </SectionTab>
              ))}
            </SectionTabs>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
