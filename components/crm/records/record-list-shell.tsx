"use client";

import type { ReactNode } from "react";

import { Alert, Button, Input, PageHeader } from "@corelithzw/react";
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
      <PageHeader
        title={title}
        lede={description}
        primaryAction={
          <Button variant="primary" size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
            {createLabel}
          </Button>
        }
      />

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
