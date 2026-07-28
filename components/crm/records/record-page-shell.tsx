"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageChrome } from "@/components/layout/page-chrome";
import { DotsThree, type LucideIcon } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

export type RecordTab = {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export type RecordAction = {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  destructive?: boolean;
};

/**
 * One record-page structure for people, companies, deals, sites and reps.
 *
 * The record's name and its actions live in the top app bar, the same as
 * every other page — so moving from a list to a record does not move the
 * controls. What stays on the page is the part the bar cannot carry: the
 * identity strip, which is the reference, the status and the one line that
 * says what this record is, sitting directly above the tabs.
 *
 * Tabs with no content are dropped rather than shown empty: a company with no
 * site visits shouldn't advertise a Visits tab, and a page that only shows
 * what exists is faster to read than one padded with blanks.
 */
export function RecordPageShell({
  backHref,
  backLabel,
  icon,
  title,
  reference,
  status,
  subtitle,
  leading,
  primaryAction,
  actions,
  tabs,
  activeTab,
  onTabChange,
  rail,
}: {
  backHref: string;
  backLabel: string;
  /** The entity's mark, shown beside the record name in the top bar. */
  icon?: LucideIcon;
  title: string;
  reference?: string | null;
  status?: { label: string; status: CanonicalUiStatus } | null;
  subtitle?: ReactNode;
  /** An avatar or monogram for the identity strip. */
  leading?: ReactNode;
  primaryAction?: ReactNode;
  actions?: RecordAction[];
  tabs: RecordTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  rail?: ReactNode;
}) {
  const visibleTabs = tabs.filter((tab) => tab.content !== null && tab.content !== undefined);

  const barActions = useMemo(
    () => (
      <>
        {primaryAction}
        {actions && actions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 px-0" aria-label="More actions">
                <DotsThree className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onSelect}
                  className={action.destructive ? "text-[var(--status-error-text)]" : undefined}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </>
    ),
    [actions, primaryAction],
  );

  return (
    <div className="space-y-4">
      <PageChrome title={title} icon={icon} backHref={backHref} backLabel={backLabel}>
        {barActions}
      </PageChrome>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {leading ? <span className="flex-none">{leading}</span> : null}

        {reference ? (
          <span className="font-mono text-sm text-[var(--text-muted)]">{reference}</span>
        ) : null}
        {status ? <StatusChip status={status.status} label={status.label} /> : null}
        {subtitle ? (
          <span className="min-w-0 truncate text-sm text-[var(--text-muted)]">{subtitle}</span>
        ) : null}
      </div>

      <div className={rail ? "detail-grid" : "min-w-0"}>
        <div className="min-w-0 space-y-4">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <div className="scroll-rail max-w-full">
              <TabsList>
                {visibleTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                    {tab.count && tab.count > 0 ? ` (${tab.count})` : ""}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {visibleTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="pt-4">
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {rail ? <aside className="space-y-3">{rail}</aside> : null}
      </div>
    </div>
  );
}

/** A titled block in the record page's right rail. */
export function RailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--card-radius)] border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A list of related records — people on a deal, sites at a company, and so on. */
export function RelatedList<T>({
  items,
  emptyMessage,
  renderItem,
  action,
}: {
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => { href: string; title: string; subtitle: string | null; meta?: string };
  action?: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>
        {action}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-[var(--border-subtle)]">
        {items.map((item, index) => {
          const rendered = renderItem(item);
          return (
            <li key={`${rendered.href}-${index}`}>
              <Link
                href={rendered.href}
                className="flex items-center justify-between gap-3 p-3 hover:bg-[var(--surface-hover)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{rendered.title}</span>
                  {rendered.subtitle ? (
                    <span className="block truncate text-sm text-[var(--text-muted)]">
                      {rendered.subtitle}
                    </span>
                  ) : null}
                </span>
                {rendered.meta ? (
                  <span className="shrink-0 font-mono text-sm text-[var(--text-muted)]">
                    {rendered.meta}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {action}
    </div>
  );
}
