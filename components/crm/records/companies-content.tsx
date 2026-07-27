"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { StatusChip } from "@/components/ui/status-chip";
import { fetchCrmCompanies, type CrmCompanyRecord } from "@/lib/crm/crm-v2";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { useDebounced } from "@/hooks/use-debounced";

import { CompanyFormSheet } from "./company-form-sheet";
import { RecordListShell } from "./record-list-shell";

const PAGE_SIZE = 50;

const COMPANY_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  PROSPECT: "Prospect",
  SUPPLIER: "Supplier",
  PARTNER: "Partner",
  OTHER: "Other",
};

const ACCOUNT_STATUS_PRESENTATION: Record<string, CanonicalUiStatus> = {
  ACTIVE: "passing",
  ON_HOLD: "pending",
  INACTIVE: "inactive",
  BLACKLISTED: "failing",
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  INACTIVE: "Inactive",
  BLACKLISTED: "Blacklisted",
};

export function CompaniesContent({ openCreate = false }: { openCreate?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  const companiesQuery = useQuery({
    queryKey: ["crm", "companies", debouncedSearch, page],
    queryFn: () =>
      fetchCrmCompanies({ filters: { q: debouncedSearch }, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => companiesQuery.data?.data ?? [], [companiesQuery.data]);
  const total = companiesQuery.data?.pagination?.total ?? rows.length;

  const columns = useMemo<ColumnDef<CrmCompanyRecord>[]>(
    () => [
      {
        id: "name",
        header: "Company",
        size: 240,
        cell: ({ row }) => (
          <Link
            href={`/crm/companies/${row.original.id}`}
            className="block min-w-0 hover:underline"
          >
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {[row.original.clientNo, row.original.tradingName].filter(Boolean).join(" · ")}
            </div>
          </Link>
        ),
      },
      {
        id: "type",
        header: "Type",
        size: 130,
        cell: ({ row }) => (
          <Badge variant="outline">
            {COMPANY_TYPE_LABELS[row.original.companyType] ?? row.original.companyType}
          </Badge>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        size: 220,
        cell: ({ row }) => (
          <div className="min-w-0 text-sm">
            <div className="truncate">{row.original.email ?? "—"}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {row.original.phone ?? ""}
            </div>
          </div>
        ),
      },
      {
        id: "location",
        header: "Location",
        size: 180,
        cell: ({ row }) => (
          <span className="truncate text-sm">
            {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "people",
        header: "People",
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original._count?.people ?? 0}</span>
        ),
      },
      {
        id: "deals",
        header: "Deals",
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original._count?.deals ?? 0}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        size: 140,
        cell: ({ row }) => (
          <StatusChip
            status={ACCOUNT_STATUS_PRESENTATION[row.original.accountStatus] ?? "pending"}
            label={ACCOUNT_STATUS_LABELS[row.original.accountStatus] ?? row.original.accountStatus}
          />
        ),
      },
      {
        id: "owner",
        header: "Owner",
        size: 150,
        cell: ({ row }) => (
          <span className="truncate text-sm">{row.original.assignedTo?.name ?? "Unassigned"}</span>
        ),
      },
    ],
    [],
  );

  return (
    <RecordListShell
      title="Companies"
      description="Customer organisations, suppliers and partners."
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search companies by name, number or city"
      createLabel="New company"
      onCreate={() => setCreateOpen(true)}
      error={companiesQuery.error}
    >
      <DataTable
        // The shell above owns search; a second box in the table toolbar is the
        // duplicate-control failure the cookbook's one-filter-pathway rule exists to stop.
        features={{ globalFilter: false }}
        data={rows}
        columns={columns}
        edgeToEdge
        stickyHeader
        queryState={{ mode: "paginated", page, pageSize: PAGE_SIZE }}
        onQueryStateChange={(next) => {
          if (next.page && next.page !== page) setPage(next.page);
        }}
        pagination={{
          enabled: true,
          server: true,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
        mobileCardRenderer={({ row }) => (
          <Link
            href={`/crm/companies/${row.id}`}
            className="flex flex-col gap-1 rounded-[var(--card-radius)] border border-[var(--border)] p-3"
          >
            <span className="font-medium">{row.name}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {[row.clientNo, [row.city, row.country].filter(Boolean).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="text-sm">{row.email ?? row.phone ?? ""}</span>
          </Link>
        )}
        emptyState={
          companiesQuery.isLoading
            ? "Loading companies…"
            : "No companies yet. Add one, or convert a lead."
        }
      />

      <CompanyFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
