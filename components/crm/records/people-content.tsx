"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge, Button } from "@corelithzw/react";
import { fetchCrmPeople } from "@/lib/crm/crm-v2";
import { useDebounced } from "@/hooks/use-debounced";

import { PersonFormSheet } from "./person-form-sheet";
import { RecordListPager, type RecordListRow } from "./record-list";
import { RecordMark } from "./record-mark";
import {
  GroupedRecordList,
  bucketByLetter,
  type RecordListSection,
} from "./record-list-groups";
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
          <RecordMark
            kind="person"
            name={person.fullName}
            emoji={person.emoji}
            avatarUrl={person.avatarUrl}
            size="md"
          />
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

  // A directory is scanned by name, so it gets the grouped-by-section recipe:
  // one heading per letter, and a jump strip once the page is long enough for
  // scrolling to it to be work. A search result is ranked by relevance, not
  // alphabet, so it stays a flat list.
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
      title="People"
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
      <GroupedRecordList
        sections={debouncedSearch ? [{ id: "results", label: "Results", rows }] : sections}
        showJumpStrip={!debouncedSearch && rows.length >= 30}
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
