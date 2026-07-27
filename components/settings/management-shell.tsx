"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@corelithzw/react";

import { NavGroup, NavItem } from "@/components/ui/settings-rail";
import {
  getAreaLabel,
  getVisibleManagementAreaNavItems,
  getVisibleManagementModuleItems,
  isActiveHref,
  isPathMatchingPrefix,
  type ManagementArea,
} from "@/lib/settings/management-nav";
import { getWorkspaceModulePresentation } from "@/lib/workspace-products";

type ManagementShellProps = {
  area: ManagementArea;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function ManagementShell({
  area,
  title,
  description,
  actions,
  children,
}: ManagementShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const enabledFeatures = useMemo(
    () => (session?.user as { enabledFeatures?: string[] } | undefined)?.enabledFeatures,
    [session],
  );
  const workspaceProfile = (session?.user as { workspaceProfile?: string } | undefined)?.workspaceProfile;
  const modulePresentation = useMemo(
    () =>
      getWorkspaceModulePresentation({
        moduleId: "management",
        enabledFeatures,
        workspaceProfile,
      }),
    [enabledFeatures, workspaceProfile],
  );

  const visibleModules = useMemo(
    () => getVisibleManagementModuleItems(enabledFeatures),
    [enabledFeatures],
  );
  const visibleAreaTabs = useMemo(
    () => getVisibleManagementAreaNavItems(area, enabledFeatures),
    [area, enabledFeatures],
  );
  const areaLabel = getAreaLabel(area);

  return (
    <div className="settings-layout container mx-auto w-full">
      <aside className="settings-rail" aria-label="Management navigation">
        <NavGroup label="Settings">
          {visibleModules.map((module) => {
            const ModuleIcon = module.icon;
            return (
              <NavItem
                key={module.id}
                to={module.href}
                active={isPathMatchingPrefix(pathname, module.matchPrefixes)}
                icon={ModuleIcon ? <ModuleIcon className="size-4" aria-hidden="true" /> : undefined}
              >
                {module.label}
              </NavItem>
            );
          })}
        </NavGroup>

        <NavGroup label={areaLabel}>
          {visibleAreaTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <NavItem
                key={tab.id}
                to={tab.href}
                active={isActiveHref(pathname, tab.href)}
                icon={TabIcon ? <TabIcon className="size-4" aria-hidden="true" /> : undefined}
              >
                {tab.label}
              </NavItem>
            );
          })}
        </NavGroup>
      </aside>

      <section className="settings-content">
        <PageHeader title={title || modulePresentation.title} primaryAction={actions} />
        {description ? (
          <p className="t-body t-muted max-w-[var(--content-max)]">{description}</p>
        ) : null}
        <div className="w-full max-w-[96rem] space-y-6">{children}</div>
      </section>
    </div>
  );
}
