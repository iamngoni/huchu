"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { fetchCrmSites, type CrmSiteRecord } from "@/lib/crm/crm-v2";
import { useDebounced } from "@/hooks/use-debounced";

import { SiteFormSheet } from "./site-form-sheet";
import { RecordListShell } from "./record-list-shell";

const PAGE_SIZE = 50;

export function SitesContent({ openCreate = false }: { openCreate?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  const sitesQuery = useQuery({
    queryKey: ["crm", "sites", debouncedSearch, page],
    queryFn: () => fetchCrmSites({ filters: { q: debouncedSearch }, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => sitesQuery.data?.data ?? [], [sitesQuery.data]);
  const total = sitesQuery.data?.pagination?.total ?? rows.length;

  const columns = useMemo<ColumnDef<CrmSiteRecord>[]>(
    () => [
      {
        id: "name",
        header: "Site",
        size: 220,
        cell: ({ row }) => (
          <Link href={`/crm/sites/${row.original.id}`} className="block min-w-0 hover:underline">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate font-mono text-xs text-[var(--text-muted)]">
              {row.original.siteNo}
            </div>
          </Link>
        ),
      },
      {
        id: "company",
        header: "Company",
        size: 200,
        cell: ({ row }) =>
          row.original.client ? (
            <Link
              href={`/crm/companies/${row.original.client.id}`}
              className="truncate text-sm hover:underline"
            >
              {row.original.client.name}
            </Link>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">—</span>
          ),
      },
      {
        id: "address",
        header: "Address",
        size: 240,
        cell: ({ row }) => (
          <div className="min-w-0 text-sm">
            <div className="truncate">{row.original.addressLine ?? "—"}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {row.original.city ?? ""}
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        size: 200,
        cell: ({ row }) => (
          <div className="min-w-0 text-sm">
            <div className="truncate">{row.original.primaryContact?.fullName ?? "—"}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {row.original.primaryContact?.phone ?? ""}
            </div>
          </div>
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
        id: "visits",
        header: "Visits",
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original._count?.appointments ?? 0}</span>
        ),
      },
    ],
    [],
  );

  return (
    <RecordListShell
      title="Sites"
      description="Places where work happens — addresses, access notes and past measurements, entered once."
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search sites by name, address or city"
      createLabel="New site"
      onCreate={() => setCreateOpen(true)}
      error={sitesQuery.error}
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
            href={`/crm/sites/${row.id}`}
            className="flex flex-col gap-1 rounded-[var(--card-radius)] border border-[var(--border)] p-3"
          >
            <span className="font-medium">{row.name}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {[row.client?.name, row.city].filter(Boolean).join(" · ") || row.siteNo}
            </span>
            <span className="text-sm">{row.addressLine ?? ""}</span>
          </Link>
        )}
        emptyState={
          sitesQuery.isLoading
            ? "Loading sites…"
            : "No sites yet. Add the places you work at so nobody re-types an address."
        }
      />

      <SiteFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
