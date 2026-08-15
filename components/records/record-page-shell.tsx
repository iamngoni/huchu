"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useIsBelow, useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger, Stack } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageChrome } from "@/components/layout/page-chrome";
import { IconButton } from "@/components/ui/icon-button";
import { DotsThree, type LucideIcon } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { cn } from "@/lib/utils";

/** The synthetic tab the rail becomes when there is no room beside the content. */
const OVERVIEW_TAB = "overview";

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
  attributes,
  beforeTabs,
  children,
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
  /**
   * A record-specific band between the properties and the tabs. A lead's
   * stage stepper lives here: its stages are a fixed enum you click along,
   * which is neither a property nor a tab.
   */
  beforeTabs?: ReactNode;
  /** Sheets and dialogs the page owns — mounted outside the tab content so
   *  they survive a tab change. */
  children?: ReactNode;
  /**
   * The record's properties, shown above the tabs. Notion-style, because a
   * property in a right rail is one a phone never shows and a reader looks at
   * last — which is how they go stale.
   */
  attributes?: ReactNode;
}) {
  // Below `lg` there is no room for a rail beside the content, and stacking it
  // above the tabs pushed the record itself under the fold — you scrolled past
  // a summary to reach the thing you opened. So the summary becomes a tab, and
  // it is the one you land on: the same content, in a place with a name.
  const compact = useIsBelow(1024);
  // The width at which the app bar switches to its phone row and stops having
  // room for the record's name. Not the same question as `compact`, which is
  // about whether a rail fits beside the content.
  const narrow = useIsMobile();

  const visibleTabs = useMemo(() => {
    const real = tabs.filter((tab) => tab.content !== null && tab.content !== undefined);
    if (!rail || !compact) return real;
    return [{ value: OVERVIEW_TAB, label: "Overview", content: rail }, ...real];
  }, [tabs, rail, compact]);

  // Compact, the landing tab is Overview: it is what the rail used to show
  // before anything else, and a record that opens on its timeline makes you
  // hunt for the summary you came for. The parent still owns which *real* tab
  // is showing, so "add a task" jumping to Tasks works from here too.
  const [compactTab, setCompactTab] = useState<string | null>(null);
  // Adjusting state during render rather than in an effect: this is the
  // sanctioned way to follow a prop, and it lands before paint instead of
  // showing the old tab for a frame.
  const [lastActive, setLastActive] = useState(activeTab);
  if (activeTab !== lastActive) {
    setLastActive(activeTab);
    setCompactTab(activeTab);
  }

  const preferred = compact && rail ? (compactTab ?? OVERVIEW_TAB) : activeTab;

  // Widening the window takes the Overview tab away with the rail. Falling back
  // to the first real tab beats rendering a pane that no trigger points at.
  const currentTab = visibleTabs.some((tab) => tab.value === preferred)
    ? preferred
    : (visibleTabs[0]?.value ?? activeTab);

  const handleTabChange = (value: string) => {
    setCompactTab(value);
    if (value !== OVERVIEW_TAB) onTabChange(value);
  };

  /**
   * The record's actions, in the top app bar.
   *
   * Two shapes, because the bar has two.
   *
   * On a desktop the bar renders whatever it is given, side by side, so the
   * secondary actions are collected into a menu here — a row of five buttons
   * beside the record's name is not a bar, it is a toolbar.
   *
   * On a phone the bar does its own collecting: it shows the first action and
   * folds the rest behind a "More actions" button of its own. Handing it a
   * menu, as this used to, meant the phone put a menu inside a menu — you
   * pressed `···` and got a panel containing a single unlabelled `···` to
   * press again, with two controls on screen both called "More actions". So
   * the phone gets the actions flat and the bar folds them once.
   */
  const barActions = useMemo(() => {
    if (!actions || actions.length === 0) return primaryAction;

    if (narrow) {
      return (
        <>
          {primaryAction}
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2",
                action.destructive && "text-[var(--status-error-text)]",
              )}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </>
      );
    }

    return (
      <>
        {primaryAction}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label="More actions">
              <DotsThree />
            </IconButton>
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
      </>
    );
  }, [actions, narrow, primaryAction]);

  return (
    <div className="space-y-4">
      <PageChrome title={title} icon={icon} backHref={backHref} backLabel={backLabel}>
        {barActions}
      </PageChrome>

      {/* The record's name, on a phone.
          ================================
          It lives in the top app bar, which on a 390px screen is holding a
          back arrow, a search icon, a bell and a primary action as well — so
          the name truncated to "Tenant b…" and appeared nowhere else on the
          page. The strip below carries the reference and the status; on a
          phone it carries the name too, at the size a page title reads. */}
      {narrow ? (
        <h2 className="text-base font-semibold text-[var(--text-strong)]">{title}</h2>
      ) : null}

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

      {attributes ? (
        <div className="border-y border-[var(--border-subtle)] py-3">{attributes}</div>
      ) : null}

      {beforeTabs}

      <div className={rail ? "detail-grid" : "min-w-0"}>
        <div className="min-w-0 space-y-4">
          <Tabs value={currentTab} onValueChange={handleTabChange}>
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
              <TabsContent
                key={tab.value}
                value={tab.value}
                className={tab.value === OVERVIEW_TAB ? "space-y-7 pt-5" : "pt-4"}
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {rail ? <aside className="hidden space-y-7 lg:block">{rail}</aside> : null}
      </div>

      {children}
    </div>
  );
}

/**
 * A titled block in the record page's rail.
 *
 * No frame. A record has seven or eight of these — the value, the score, what
 * is next, the last email, what is owed — and a border around each turned the
 * rail into a column of boxes that all shout equally, which on a phone is the
 * first thing anybody sees. The heading already says where one section stops
 * and the next starts; a box around it says the same thing twice, louder.
 *
 * Headings are small and quiet on purpose. They are signposts for the figures
 * beneath them, and the figures are the content.
 */
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
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        {/* Uppercase and letter-spaced rather than merely small: at this size
            a lowercase grey heading reads as another line of body text, which
            is what left the rail looking like one undifferentiated column. */}
        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
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
      <Stack as="ul" gap="xs">
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
      </Stack>
      {action}
    </div>
  );
}
