"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Button, EmptyState, Skeleton } from "@corelithzw/react";
import { ChevronRight } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * The CRM record list.
 *
 * People, companies, sites, collections and the rest are lists of things you
 * open, not grids of numbers you compare — so they get the list pattern rather
 * than a data table. Each row is a title, a supporting line, and a small
 * cluster of facts on the right; the whole row is the link, which is what makes
 * it work with a thumb as well as a mouse.
 *
 * DataTable is still the right answer for a comparison surface — sortable
 * columns, bulk selection, money you scan down a column. It is the wrong
 * answer for "find the company and open it", where it spends a header row and
 * six columns saying what one line of text would.
 */

export type RecordListFact = {
  /** Short label. Hidden on narrow screens where only the value fits. */
  label?: string;
  value: ReactNode;
  /** Numerals line up when this is set — codes, money, counts. */
  mono?: boolean;
};

export type RecordListRow = {
  id: string;
  href: string;
  title: ReactNode;
  /** One line under the title: the thing that tells two similar rows apart. */
  subtitle?: ReactNode;
  /** Leading avatar, icon or initials. */
  leading?: ReactNode;
  /** Status chip or badge, shown beside the title. */
  status?: ReactNode;
  /** Up to three facts, right-aligned. Dropped below `sm`. */
  facts?: RecordListFact[];
  /** Row-level actions. Rendered outside the link so they stay clickable. */
  actions?: ReactNode;
};

export function RecordList({
  rows,
  isLoading,
  emptyTitle = "Nothing here yet",
  emptyBody,
  emptyAction,
  className,
}: {
  rows: RecordListRow[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  return (
    <ul
      className={cn(
        "divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]",
        className,
      )}
    >
      {rows.map((row) => (
        <li key={row.id} className="relative flex items-center gap-3 pr-3">
          <Link
            href={row.href}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 hover:bg-[var(--surface-muted)]"
          >
            {row.leading ? <span className="flex-none">{row.leading}</span> : null}

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                  {row.title}
                </span>
                {row.status}
              </span>
              {row.subtitle ? (
                <span className="mt-0.5 block truncate text-sm text-[var(--text-muted)]">
                  {row.subtitle}
                </span>
              ) : null}
            </span>

            {/* Facts are supporting detail, so they are the first thing to go
                when the row runs out of room. */}
            {row.facts?.length ? (
              <span className="hidden flex-none items-center gap-6 sm:flex">
                {row.facts.map((fact, index) => (
                  <span key={index} className="text-right">
                    {fact.label ? (
                      <span className="block text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                        {fact.label}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "block text-sm text-[var(--text-body)]",
                        fact.mono ? "font-mono tabular-nums" : "",
                      )}
                    >
                      {fact.value}
                    </span>
                  </span>
                ))}
              </span>
            ) : null}

            <ChevronRight className="size-4 flex-none text-[var(--text-subtle)]" />
          </Link>

          {row.actions ? <span className="flex-none">{row.actions}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Showing 20 of 340" plus a pair of page buttons.
 *
 * A list does not need a table's pagination bar — page size, jump-to-page and
 * a row-count select are controls for a grid you are working through, not a
 * list you are scanning.
 */
export function RecordListPager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--text-muted)]">
        Showing <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> of{" "}
        <span className="font-mono">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
