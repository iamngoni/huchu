"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotsThree } from "@/lib/icons";
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
 * One record-page structure for people, companies, deals and sites.
 *
 * Tabs with no content are dropped rather than shown empty: a company with no
 * site visits shouldn't advertise a Visits tab, and a page that only shows
 * what exists is faster to read than one padded with blanks.
 */
export function RecordPageShell({
  backHref,
  backLabel,
  title,
  reference,
  status,
  subtitle,
  primaryAction,
  actions,
  tabs,
  activeTab,
  onTabChange,
  rail,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  reference?: string | null;
  status?: { label: string; status: CanonicalUiStatus } | null;
  subtitle?: ReactNode;
  primaryAction?: ReactNode;
  actions?: RecordAction[];
  tabs: RecordTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  rail?: ReactNode;
}) {
  const visibleTabs = tabs.filter((tab) => tab.content !== null && tab.content !== undefined);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <Link href={backHref} className="text-sm text-[var(--text-muted)] hover:underline">
          ← {backLabel}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{title}</h1>
              {status ? <StatusChip status={status.status} label={status.label} /> : null}
            </div>
            {subtitle ? (
              <div className="text-sm text-[var(--text-muted)]">
                {reference ? <span className="font-mono">{reference}</span> : null}
                {reference ? " · " : null}
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
      <ul className="divide-y divide-[var(--border)] rounded-[var(--card-radius)] border border-[var(--border)]">
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
                    <span className="block truncate text-xs text-[var(--text-muted)]">
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
