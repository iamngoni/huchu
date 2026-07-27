"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button } from "@corelithzw/react";
import { fetchCrmPeople } from "@/lib/crm/crm-v2";
import { useDebounced } from "@/hooks/use-debounced";

import { PersonFormSheet } from "./person-form-sheet";
import { RecordList, RecordListPager, type RecordListRow } from "./record-list";
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

/** Two letters is enough to tell rows apart while you scan. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PeopleContent({ openCreate = false }: { openCreate?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  const peopleQuery = useQuery({
    queryKey: ["crm", "people", debouncedSearch, page],
    queryFn: () => fetchCrmPeople({ filters: { q: debouncedSearch }, page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const people = useMemo(() => peopleQuery.data?.data ?? [], [peopleQuery.data]);
  const total = peopleQuery.data?.pagination?.total ?? people.length;

  const rows = useMemo<RecordListRow[]>(
    () =>
      people.map((person) => ({
        id: person.id,
        href: `/crm/people/${person.id}`,
        leading: (
          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-medium text-[var(--text-muted)]">
            {initials(person.fullName)}
          </span>
        ),
        title: person.fullName,
        subtitle:
          [person.jobTitle, person.client?.name, person.email ?? person.phone]
            .filter(Boolean)
            .join(" · ") || person.personNo,
        status: (
          <Badge tone="neutral" size="sm">
            {CONTACT_TYPE_LABELS[person.contactType] ?? person.contactType}
          </Badge>
        ),
        facts: [
          { label: "Deals", value: person._count?.dealContacts ?? 0, mono: true },
          { label: "Owner", value: person.assignedTo?.name ?? "Unassigned" },
        ],
      })),
    [people],
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
      <RecordList
        rows={rows}
        isLoading={peopleQuery.isLoading}
        emptyTitle={debouncedSearch ? "No people match that search" : "No people yet"}
        emptyBody={
          debouncedSearch
            ? undefined
            : "Add someone, or convert a lead and its contact comes with it."
        }
        emptyAction={
          debouncedSearch ? undefined : (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              Add the first person
            </Button>
          )
        }
      />

      <RecordListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <PersonFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
