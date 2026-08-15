"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Stack } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { NavRail, NavRailItem } from "@/components/ui/nav-rail";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageChrome } from "@/components/layout/page-chrome";
import { IconButton } from "@/components/ui/icon-button";
import { useIsMobile } from "@/hooks/use-mobile";
import { DotsThree, type LucideIcon } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { cn } from "@/lib/utils";

/** The query parameter that says which section of a record is open. */
const SECTION_PARAM = "section";

export type RecordTab = {
  value: string;
  label: string;
  count?: number;
  /** The section's mark, shown in the rail at every width. */
  icon?: LucideIcon;
  /**
   * Something in here wants looking at — an unread comment, an overdue task,
   * a quote waiting on a customer. Drawn as a dot, because a count already
   * says how much and this says whether it matters.
   */
  attention?: boolean;
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
 *
 * ## Which section is open lives in the URL
 *
 * `?section=documents`, not component state. Three things fall out of that and
 * none of them work without it: the phone's back arrow and the browser's back
 * button both return to the record rather than to the list two levels up, a
 * link to a record's documents is a link somebody can send, and the first
 * paint is correct — the alternative is `matchMedia`, which has no answer
 * before hydration and paints the desktop shape on a phone for a frame.
 *
 * ## The sections are a rail, and a phone drills into one
 *
 * Thirteen sections is not a tab strip: it wrapped onto two rows at 1440px and
 * had to be scrolled sideways at 390px. They are a vertical rail — the one the
 * back office already uses — beside the section on a desktop, and the same rail
 * at the foot of the landing view on a phone, where tapping a row opens that
 * section full-width. Both read the same URL, so neither is a separate mode.
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The width at which the app bar switches to its phone row and stops having
  // room for the record's name. Only ever used for chrome the bar itself owns.
  const narrow = useIsMobile();

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.content !== null && tab.content !== undefined),
    [tabs],
  );

  const landingTab = visibleTabs[0];
  const requested = searchParams.get(SECTION_PARAM);
  // A stale or hand-typed section name falls back to the landing view rather
  // than rendering a page with nothing on it.
  const openSection = visibleTabs.some((tab) => tab.value === requested) ? requested : null;

  const sectionHref = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set(SECTION_PARAM, value);
    return `${pathname}?${next.toString()}`;
  };

  /** The record with no section open — where the phone's back arrow returns to. */
  const recordHref = (() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(SECTION_PARAM);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  })();

  // The parent still owns `activeTab`, because buttons inside the page jump
  // sections — "add a task" from an empty Up next, "open documents" from the
  // billing panel. Those set the parent's state; this carries the change into
  // the URL, which is where everything else reads it from.
  useEffect(() => {
    if (!activeTab || activeTab === openSection) return;
    if (!visibleTabs.some((tab) => tab.value === activeTab)) return;
    // The landing tab is the record's own page, not a section of it.
    if (activeTab === landingTab?.value) return;
    window.history.pushState(null, "", sectionHref(activeTab));
    // `sectionHref` closes over this render's params; re-running on every
    // render is what a dependency array would buy, and it is not wanted here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const currentTab = openSection
    ? visibleTabs.find((tab) => tab.value === openSection)
    : landingTab;

  /**
   * The sections, as one vertical rail at every width.
   *
   * They were a horizontal strip, which is the wrong shape for this many:
   * thirteen sections wrapped onto two rows on a 1440px desktop and had to be
   * scrolled sideways on a phone. A segmented control — the grammar the
   * activity composer uses for Note / Call / Email — is right for three or
   * four peers in a fixed track and cannot hold thirteen; its columns are
   * equal-width by construction.
   *
   * So the rail the back office already uses for exactly this problem: a
   * column of 36px rows with the mark, the name and the count. On a desktop it
   * sits to the left of the section. On a phone it is the same rail at the
   * foot of the landing view, and tapping a row opens that section full-width.
   * One component, one grammar, two placements.
   */
  const sectionRail = (
    <NavRail label={`${title} sections`}>
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavRailItem
            key={tab.value}
            to={tab.value === landingTab?.value ? recordHref : sectionHref(tab.value)}
            active={tab.value === currentTab?.value}
            icon={Icon ? <Icon className="size-4" aria-hidden="true" /> : undefined}
            // A zero is not a count — it is a column of grey noise. Only a
            // section with something in it says how much.
            count={tab.count && tab.count > 0 ? tab.count : undefined}
            trailing={
              tab.attention ? (
                <span
                  aria-label="Needs attention"
                  className="size-1.5 rounded-full bg-[var(--action-primary-bg)]"
                />
              ) : undefined
            }
          >
            {tab.label}
          </NavRailItem>
        );
      })}
    </NavRail>
  );

  // The right column carries the properties and the summary, so it is worth a
  // column whenever there is either.
  const hasRightColumn = Boolean(rail || attributes);
  const hasSectionRail = visibleTabs.length > 1;

  // One column on a phone; sections plus content from `md`; and the standing
  // column from `lg`, which is where `.detail-grid` already stopped crushing
  // the middle.
  const sectionGrid = cn(
    "min-w-0 md:grid md:gap-6",
    hasSectionRail ? "md:grid-cols-[13rem_minmax(0,1fr)]" : "md:grid-cols-1",
    hasRightColumn && hasSectionRail && "lg:grid-cols-[13rem_minmax(0,1fr)_20rem]",
    hasRightColumn && !hasSectionRail && "lg:grid-cols-[minmax(0,1fr)_20rem]",
  );

  // And the other direction: the URL is the source of truth, so a page holding
  // its own `tab` state — the lead's billing panel jumps to Documents, the
  // deal's stage bar reads which section is open — is told when it changes.
  // The push effect above bails when the two already agree, so this cannot
  // ping-pong with it.
  const currentValue = currentTab?.value;
  useEffect(() => {
    if (currentValue && currentValue !== activeTab) onTabChange(currentValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue]);

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
                variant={action.destructive ? "destructive" : "default"}
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
      {/* Drilled into a section, "up" is the record — not the list it came
          from. Getting that wrong is what makes a phone drilldown feel like a
          trapdoor: you open Documents, press back, and you are in the leads
          list with the record gone. */}
      {/* The bar keeps saying which *record* you are in, at every depth —
          losing that is how a drilldown stops feeling like part of the record
          and starts feeling like a separate page. The section names itself on
          the page below. */}
      <PageChrome
        title={title}
        icon={icon}
        backHref={openSection ? recordHref : backHref}
        backLabel={openSection ? title : backLabel}
      >
        {barActions}
      </PageChrome>

      {/* The record's frame, at every depth.
          =====================================
          Opening a section used to replace the whole page — right for a phone,
          where a drilldown *is* the page, and wrong for a desktop, which lost
          its section rail and its properties the moment you clicked one of
          them. The frame is always rendered now and the phone hides the parts
          it does not want, in CSS, so the first paint is right at both widths.
          Only the middle column changes. */}
      <div className={openSection ? "hidden space-y-4 md:block" : "space-y-4"}>
        {/* The record's name, on a phone.
            ================================
            It lives in the top app bar, which on a 390px screen is holding a
            back arrow, a search icon, a bell and a primary action as well —
            so the name truncated to "Tenant b…" and appeared nowhere else on
            the page. The strip below carries the reference and the status;
            on a phone it carries the name too, at the size a page title
            reads. */}
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

        {/* Properties are the right column's job from `lg` up, where they can
            stay in view while you read a section. Below that there is no third
            column, so they sit here, full width, the way Notion puts them at
            the top of a page. */}
        {attributes ? (
          <div className="border-y border-[var(--border-subtle)] py-3 lg:hidden">{attributes}</div>
        ) : null}

        {beforeTabs}
      </div>

      <div className={sectionGrid}>
        {/* The sections, on the left, where the back office puts them. */}
        {visibleTabs.length > 1 ? (
          <aside className="hidden md:block">{sectionRail}</aside>
        ) : null}

        <div className="min-w-0 space-y-4">
          {/* Drilled in on a phone, the section names itself — the bar is
              still carrying the record's name. */}
          {openSection ? (
            <h2 className="text-base font-semibold text-[var(--text-strong)] md:hidden">
              {currentTab?.label}
            </h2>
          ) : null}

          {/* The summary, above the story, in one view.
              ==========================================
              The rail used to become a tab of its own called "Overview",
              which a phone landed on — so a record opened on a summary and
              the thing that had actually happened to it was one tap away,
              behind a word. They are one reading now: what this record is
              worth and what is next, then what has happened. */}
          {rail && !openSection ? <div className="space-y-7 lg:hidden">{rail}</div> : null}

          <div className="min-w-0">{currentTab?.content}</div>

          {/* The same rail, at the foot of the landing view, where a phone
              has no column to put it in. One component either way, so a
              section reads the same whichever width you meet it at. */}
          {visibleTabs.length > 1 && !openSection ? (
            <div className="border-t border-[var(--border-subtle)] pt-4 md:hidden">
              {sectionRail}
            </div>
          ) : null}
        </div>

        {/* The column that never changes: what this record *is*, and what it
            is worth, beside whichever section is being read. */}
        {hasRightColumn ? (
          <aside className="hidden space-y-7 lg:block">
            {attributes ? <div>{attributes}</div> : null}
            {rail}
          </aside>
        ) : null}
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
