"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ClientDate } from "@/components/ui/client-date";
import { fetchCrmPeople, type CrmPersonRecord } from "@/lib/crm/crm-v2";
import { useDebounced } from "@/hooks/use-debounced";

import { PersonFormSheet } from "./person-form-sheet";
import { RecordListShell } from "./record-list-shell";

const PAGE_SIZE = 50;

const CONTACT_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  DECISION_MAKER: "Decision-maker",
  SITE_CONTACT: "Site contact",
  FINANCE_CONTACT: "Finance contact",
  SUPPLIER_CONTACT: "Supplier",
  REFERRAL_PARTNER: "Referral partner",
  OTHER: "Other",
};

export function PeopleContent({ openCreate = false }: { openCreate?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  const peopleQuery = useQuery({
    queryKey: ["crm", "people", debouncedSearch, page],
    queryFn: () =>
      fetchCrmPeople({ filters: { q: debouncedSearch }, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => peopleQuery.data?.data ?? [], [peopleQuery.data]);
  const total = peopleQuery.data?.pagination?.total ?? rows.length;

  const columns = useMemo<ColumnDef<CrmPersonRecord>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        size: 220,
        cell: ({ row }) => (
          <Link href={`/crm/people/${row.original.id}`} className="block min-w-0 hover:underline">
            <div className="truncate font-medium">{row.original.fullName}</div>
            <div className="truncate text-xs text-[var(--text-muted)]">
              {row.original.jobTitle ?? row.original.personNo}
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
        id: "type",
        header: "Type",
        size: 140,
        cell: ({ row }) => (
          <Badge variant="outline">
            {CONTACT_TYPE_LABELS[row.original.contactType] ?? row.original.contactType}
          </Badge>
        ),
      },
      {
        id: "deals",
        header: "Deals",
        size: 80,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original._count?.dealContacts ?? 0}</span>
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
      {
        id: "updated",
        header: "Updated",
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">
            <ClientDate value={row.original.updatedAt} mode="date" />
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <RecordListShell
      title="People"
      description="Everyone you deal with, reusable across deals, companies and sites."
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search people by name, email or phone"
      createLabel="New person"
      onCreate={() => setCreateOpen(true)}
      error={peopleQuery.error}
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
            href={`/crm/people/${row.id}`}
            className="flex flex-col gap-1 rounded-[var(--card-radius)] border border-[var(--border)] p-3"
          >
            <span className="font-medium">{row.fullName}</span>
            <span className="text-xs text-[var(--text-muted)]">
              {[row.jobTitle, row.client?.name].filter(Boolean).join(" · ") || row.personNo}
            </span>
            <span className="text-sm">{row.email ?? row.phone ?? ""}</span>
          </Link>
        )}
        emptyState={
          peopleQuery.isLoading ? "Loading people…" : "No people yet. Add one, or convert a lead."
        }
      />

      <PersonFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
