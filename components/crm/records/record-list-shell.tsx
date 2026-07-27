"use client";

import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "@/lib/icons";
import { getApiErrorMessage } from "@/lib/api-client";

/**
 * The frame every CRM record list shares: title, search box, filters, a
 * create button, and consistent error handling. Keeping it in one place is
 * what stops people, companies, deals and sites drifting into four
 * differently-shaped pages.
 */
export function RecordListShell({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  createLabel,
  onCreate,
  error,
  children,
}: {
  title: string;
  description?: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  createLabel: string;
  onCreate: () => void;
  error?: unknown;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
        <Button size="sm" className="gap-1.5" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          {createLabel}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full sm:w-72"
          aria-label={searchPlaceholder}
        />
        {filters}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load {title.toLowerCase()}</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {children}
    </div>
  );
}
