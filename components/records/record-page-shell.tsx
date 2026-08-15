"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Stack } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { SectionTab, SectionTabs } from "@/components/ui/section-tabs";
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
import { ChevronRight, DotsThree, type LucideIcon } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { cn } from "@/lib/utils";

/** The query parameter that says which section of a record is open. */
const SECTION_PARAM = "section";

export type RecordTab = {
  value: string;
  label: string;
  count?: number;
  /** The section's mark, shown in the strip and in the phone's section list. */
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
 * ## A phone drills in; a desktop switches tabs
 *
 * Nine sections is not a tab strip at 390px; it is a strip you scroll sideways
 * hunting for a word. So the phone gets what the sections actually are — a
 * list, with the mark, the count and whether anything needs attention — and
 * opening one fills the page. The strip is still a strip where there is room
 * for it. Both read the same URL, so neither is a separate mode.
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

      {openSection ? (
        <>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {currentTab?.label}
          </h2>
          <div className="min-w-0">{currentTab?.content}</div>
        </>
      ) : (
        <>
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

          {attributes ? (
            <div className="border-y border-[var(--border-subtle)] py-3">{attributes}</div>
          ) : null}

          {beforeTabs}

          <div className={rail ? "detail-grid" : "min-w-0"}>
            <div className="min-w-0 space-y-4">
              {/* The strip, where there is room for one. Below `md` the same
                  sections are a list further down the page, so this is hidden
                  in CSS rather than by a media query hook — a hook has no
                  answer before hydration and would paint a nine-item strip on
                  a phone for a frame. */}
              {visibleTabs.length > 1 ? (
                // `.section-tabs` scrolls sideways on its own; wrapping it in
                // another scroller made it wrap onto a second row instead.
                <div className="hidden max-w-full md:block">
                  <SectionTabs label={`${title} sections`}>
                    {visibleTabs.map((tab) => (
                      <SectionTab
                        key={tab.value}
                        to={tab.value === landingTab?.value ? recordHref : sectionHref(tab.value)}
                        active={tab.value === currentTab?.value}
                        icon={tab.icon ? <tab.icon aria-hidden="true" /> : undefined}
                        // A zero is not a count, it is nine grey pills saying
                        // nothing. Only a section with something in it says
                        // how much.
                        count={tab.count && tab.count > 0 ? tab.count : undefined}
                      >
                        {tab.label}
                        {tab.attention ? (
                          <span
                            aria-label="Needs attention"
                            className="ml-1 inline-block size-1.5 rounded-full bg-[var(--action-primary-bg)] align-middle"
                          />
                        ) : null}
                      </SectionTab>
                    ))}
                  </SectionTabs>
                </div>
              ) : null}

              {/* The summary, above the story, in one view.
                  ==========================================
                  The rail used to become a tab of its own called "Overview",
                  which a phone landed on — so a record opened on a summary and
                  the thing that had actually happened to it was one tap away,
                  behind a word. They are one reading now: what this record is
                  worth and what is next, then what has happened. */}
              {rail ? <div className="space-y-7 lg:hidden">{rail}</div> : null}

              <div className="min-w-0">{landingTab?.content}</div>

              {/* Every other section, as a list. */}
              {visibleTabs.length > 1 ? (
                <nav aria-label="Record sections" className="md:hidden">
                  <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                    {visibleTabs.slice(1).map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <li key={tab.value}>
                          <Link
                            href={sectionHref(tab.value)}
                            className="flex min-h-12 items-center gap-3 py-2.5 text-sm hover:bg-[var(--surface-hover)]"
                          >
                            {Icon ? (
                              <Icon
                                className="size-4 shrink-0 text-[var(--text-subtle)]"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-[var(--text-strong)]">
                              {tab.label}
                            </span>
                            {tab.attention ? (
                              <span
                                aria-label="Needs attention"
                                className="size-1.5 shrink-0 rounded-full bg-[var(--action-primary-bg)]"
                              />
                            ) : null}
                            {tab.count && tab.count > 0 ? (
                              <span className="shrink-0 font-mono text-sm text-[var(--text-muted)]">
                                {tab.count}
                              </span>
                            ) : null}
                            <ChevronRight
                              className="size-4 shrink-0 text-[var(--text-subtle)]"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : null}
            </div>

            {rail ? <aside className="hidden space-y-7 lg:block">{rail}</aside> : null}
          </div>
        </>
      )}

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
