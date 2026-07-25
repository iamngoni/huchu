"use client";

import * as React from "react";
import {
  Alert,
  Button,
  DataTable,
  DataToolbar,
  EmptyState,
  Input,
  Pagination,
  Skeleton,
  type DataTableColumn,
  type DataTableSortState,
} from "@corelithzw/react";

export type DsDataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row, index: number) => string;
  ariaLabel: string;
  searchValue?: string;
  searchPlaceholder?: string;
  searchSubmitLabel?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  isLoading?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  error?: React.ReactNode | null;
  errorTitle?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  pagination?: {
    page: number;
    pageCount: number;
    total?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  page?: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState | undefined) => void;
};

export function DsDataTable<Row>({
  columns,
  rows,
  getRowId,
  ariaLabel,
  searchValue,
  searchPlaceholder = "Search",
  searchSubmitLabel = "Search",
  onSearchChange,
  onSearchSubmit,
  filters,
  actions,
  isLoading,
  loading,
  loadingLabel = "Fetching records",
  error,
  errorTitle = "Unable to load records",
  emptyTitle = "No records found",
  emptyDescription = "Records will appear here when they are available.",
  page,
  pageCount,
  total,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  pagination,
  sort,
  onSortChange,
}: DsDataTableProps<Row>) {
  const hasSearch = searchValue !== undefined || Boolean(onSearchChange || onSearchSubmit);
  const activePage = pagination?.page ?? page;
  const activePageCount = pagination?.pageCount ?? pageCount;
  const activeTotal = pagination?.total ?? total;
  const activePageSize = pagination?.pageSize ?? pageSize;
  const activePageSizeOptions = pagination?.pageSizeOptions ?? pageSizeOptions;
  const activeOnPageChange = pagination?.onPageChange ?? onPageChange;
  const activeOnPageSizeChange = pagination?.onPageSizeChange ?? onPageSizeChange;
  const hasPagination =
    activePage !== undefined && activePageCount !== undefined && Boolean(activeOnPageChange);
  const showLoading = isLoading ?? loading ?? false;

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger" title={errorTitle}>
          {error}
        </Alert>
      ) : null}

      <DataToolbar>
        {hasSearch ? (
          <DataToolbar.Search>
            <form
              className="flex min-w-0 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSearchSubmit?.(searchValue ?? "");
              }}
            >
              <Input
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              <Button type="submit" variant="secondary" size="sm">
                {searchSubmitLabel}
              </Button>
            </form>
          </DataToolbar.Search>
        ) : null}

        {filters ? <DataToolbar.Filters>{filters}</DataToolbar.Filters> : null}

        {actions || hasPagination ? (
          <DataToolbar.Actions>
            {actions}
            {hasPagination ? (
              <Pagination
                page={activePage!}
                pageCount={Math.max(1, activePageCount!)}
                total={activeTotal}
                pageSize={activePageSize}
                pageSizeOptions={activePageSizeOptions}
                onPageSizeChange={activeOnPageSizeChange}
                onChange={activeOnPageChange!}
                aria-label={`${ariaLabel} pagination`}
              />
            ) : null}
          </DataToolbar.Actions>
        ) : null}
      </DataToolbar>

      {showLoading ? (
        <Skeleton lines={6} gap={8} aria-label={loadingLabel} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          sort={sort}
          onSortChange={onSortChange}
          ariaLabel={ariaLabel}
          emptyState={
            <EmptyState
              variant="inline"
              title={emptyTitle}
              description={emptyDescription}
            />
          }
        />
      )}
    </div>
  );
}
