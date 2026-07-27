"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button } from "@corelithzw/react";
import { StatusChip } from "@/components/ui/status-chip";
import { fetchCrmCompanies } from "@/lib/crm/crm-v2";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { useDebounced } from "@/hooks/use-debounced";

import { CompanyFormSheet } from "./company-form-sheet";
import { RecordListPager, type RecordListRow } from "./record-list";
import {
  GroupedRecordList,
  bucketByLetter,
  type RecordListSection,
} from "./record-list-groups";
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
    queryFn: () => fetchCrmCompanies({ filters: { q: debouncedSearch }, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const companies = useMemo(() => companiesQuery.data?.data ?? [], [companiesQuery.data]);
  const total = companiesQuery.data?.pagination?.total ?? companies.length;

  const rows = useMemo<RecordListRow[]>(
    () =>
      companies.map((company) => ({
        id: company.id,
        href: `/crm/companies/${company.id}`,
        title: company.name,
        subtitle:
          [company.clientNo, [company.city, company.country].filter(Boolean).join(", ")]
            .filter(Boolean)
            .join(" · "),
        status: (
          <>
            <StatusChip
              status={ACCOUNT_STATUS_PRESENTATION[company.accountStatus] ?? "pending"}
              label={ACCOUNT_STATUS_LABELS[company.accountStatus] ?? company.accountStatus}
            />
            <Badge tone="neutral" size="sm">
              {COMPANY_TYPE_LABELS[company.companyType] ?? company.companyType}
            </Badge>
          </>
        ),
        facts: [
          { label: "People", value: company._count?.people ?? 0, mono: true },
          { label: "Deals", value: company._count?.deals ?? 0, mono: true },
          { label: "Owner", value: company.assignedTo?.name ?? "Unassigned" },
        ],
      })),
    [companies],
  );

  // Same reasoning as People: a directory is scanned by name, so it gets a
  // heading per letter and a jump strip once it is long enough to be work to
  // scroll. Search results stay flat — they are ranked, not alphabetical.
  const sections = useMemo<RecordListSection[]>(
    () =>
      bucketByLetter(rows, (row) => String(row.title ?? "")).map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        rows: bucket.items,
      })),
    [rows],
  );

  return (
    <RecordListShell
      title="Companies"
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
      <GroupedRecordList
        sections={debouncedSearch ? [{ id: "results", label: "Results", rows }] : sections}
        showJumpStrip={!debouncedSearch && rows.length >= 30}
        isLoading={companiesQuery.isLoading}
        emptyTitle={debouncedSearch ? "No companies match that search" : "No companies yet"}
        emptyBody={
          debouncedSearch ? undefined : "Add one, or convert a lead and its company comes with it."
        }
        emptyAction={
          debouncedSearch ? undefined : (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              Add the first company
            </Button>
          )
        }
      />

      <RecordListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <CompanyFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
