"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button } from "@corelithzw/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
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

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () =>
      fetchJson<{ data: Array<{ id: string; name: string | null }> }>("/api/v2/crm/team"),
    staleTime: 5 * 60_000,
  });

  const assign = useMutation({
    mutationFn: ({
      ids,
      assignedToId,
    }: {
      ids: string[];
      assignedToId: string | null;
      clear: () => void;
    }) =>
      fetchJson<{ updated: number; skipped: number }>("/api/v2/crm/people/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "assign", ids, assignedToId }),
      }),
    onSuccess: (result, variables) => {
      variables.clear();
      queryClient.invalidateQueries({ queryKey: ["crm", "people"] });
      toast({
        title: `${result.updated} ${result.updated === 1 ? "person" : "people"} reassigned`,
        // Saying what was left alone, rather than letting the count quietly
        // disagree with what was selected.
        description:
          result.skipped > 0
            ? `${result.skipped} skipped — they belong to someone else.`
            : undefined,
      });
    },
    onError: (error) =>
      toast({
        title: "Could not reassign",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

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
  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);

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
        selection={{
          selectedIds,
          onChange: setSelectedIds,
          actions: ({ ids, clear }) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Assign owner
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {owners.map((owner) => (
                  <DropdownMenuItem
                    key={owner.id}
                    onClick={() => assign.mutate({ ids, assignedToId: owner.id, clear })}
                  >
                    {owner.name ?? "Unnamed"}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => assign.mutate({ ids, assignedToId: null, clear })}
                >
                  Leave unassigned
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }}
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
