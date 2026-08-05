"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@corelithzw/react";
import { fetchCrmSites } from "@/lib/crm/crm-v2";
import { useDebounced } from "@/hooks/use-debounced";

import { SiteFormSheet } from "./site-form-sheet";
import { RecordList, RecordListPager, type RecordListRow } from "./record-list";
import { RecordMark } from "@/components/records/record-mark";
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

  const sites = useMemo(() => sitesQuery.data?.data ?? [], [sitesQuery.data]);
  const total = sitesQuery.data?.pagination?.total ?? sites.length;

  const rows = useMemo<RecordListRow[]>(
    () =>
      sites.map((site) => ({
        id: site.id,
        leading: (
          <RecordMark
            kind="site"
            name={site.name}
            emoji={site.emoji}
            avatarUrl={site.avatarUrl}
            size="md"
          />
        ),
        href: `/crm/sites/${site.id}`,
        title: site.name,
        subtitle:
          [
            site.siteNo,
            site.client?.name,
            [site.addressLine, site.city, site.country].filter(Boolean).join(", "),
          ]
            .filter(Boolean)
            .join(" · "),
        facts: [
          { label: "Contact", value: site.primaryContact?.fullName ?? "—" },
          { label: "Deals", value: site._count?.deals ?? 0, mono: true },
          { label: "Visits", value: site._count?.appointments ?? 0, mono: true },
        ],
      })),
    [sites],
  );

  return (
    <RecordListShell
      title="Sites"
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search sites by name, number or address"
      createLabel="New site"
      onCreate={() => setCreateOpen(true)}
      error={sitesQuery.error}
    >
      <RecordList
        rows={rows}
        isLoading={sitesQuery.isLoading}
        emptyTitle={debouncedSearch ? "No sites match that search" : "No sites yet"}
        emptyBody={
          debouncedSearch
            ? undefined
            : "A site is an address you keep going back to — add one and visits and deals can point at it."
        }
        emptyAction={
          debouncedSearch ? undefined : (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              Add the first site
            </Button>
          )
        }
      />

      <RecordListPager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      <SiteFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
