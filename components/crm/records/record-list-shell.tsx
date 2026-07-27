"use client";

import { useMemo, type ReactNode } from "react";

import { Alert, Button, Input } from "@corelithzw/react";
import { PageChrome } from "@/components/layout/page-chrome";
import { Plus } from "@/lib/icons";
import { getApiErrorMessage } from "@/lib/api-client";

/**
 * The frame every CRM record list shares: title, search box, filters, a
 * create button, and consistent error handling. Keeping it in one place is
 * what stops people, companies, deals and sites drifting into four
 * differently-shaped pages.
 *
 * The title and the create button are registered with the top app bar rather
 * than drawn here. A page that repeats its own name below a bar that already
 * says it is spending a band of vertical space on nothing, and the rule that
 * band drew was the seam between the bar and the content.
 */
export function RecordListShell({
  title,
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
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  createLabel: string;
  onCreate: () => void;
  error?: unknown;
  children: ReactNode;
}) {
  const actions = useMemo(
    () => (
      <Button
        variant="primary"
        size="sm"
        startIcon={<Plus className="h-4 w-4" />}
        onClick={onCreate}
      >
        {createLabel}
      </Button>
    ),
    [createLabel, onCreate],
  );

  return (
    <div className="space-y-4">
      <PageChrome title={title}>{actions}</PageChrome>

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
        <Alert tone="danger" title={`Unable to load ${title.toLowerCase()}`}>
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {children}
    </div>
  );
}
