"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClientDate } from "@/components/ui/client-date";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";
import { MapPin } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { formatMoney } from "@/components/crm/documents/document-types";
import { CommentThread } from "@/components/crm/collaboration/comment-thread";
import { RecordTasksTab } from "@/components/crm/tasks/record-tasks-tab";

import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "./record-mark";
import { EntityLink } from "./entity-link";
import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { SiteFormSheet } from "./site-form-sheet";
import { RecordHistoryTab } from "./record-history-tab";

const VISIT_STATUS: Record<string, { label: string; status: CanonicalUiStatus }> = {
  SCHEDULED: { label: "Scheduled", status: "pending" },
  COMPLETED: { label: "Completed", status: "passing" },
  CANCELLED: { label: "Cancelled", status: "inactive" },
  NO_SHOW: { label: "No show", status: "failing" },
};

type SiteDetail = {
  id: string;
  avatarUrl: string | null;
  emoji: string | null;
  siteNo: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  accessInstructions: string | null;
  siteConditions: string | null;
  customFields: Record<string, unknown> | null;
  client: { id: string; name: string } | null;
  primaryContact: { id: string; fullName: string; phone: string | null } | null;
  deals: Array<{
    id: string;
    title: string;
    value: number | null;
    currency: string;
    stage: { id: string; name: string };
  }>;
  appointments: Array<{
    id: string;
    appointmentNo: string;
    title: string;
    scheduledStart: string;
    status: string;
    visitItems: Array<{ id: string }>;
  }>;
};

export function SiteDetailPage({ siteId }: { siteId: string }) {
  const { data: session } = useSession();
  const [tab, setTab] = useState("visits");
  const [editOpen, setEditOpen] = useState(false);

  const siteQuery = useQuery({
    queryKey: ["crm", "site", siteId],
    queryFn: () => fetchJson<SiteDetail>(`/api/v2/crm/sites/${siteId}`),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "SITE"],
    queryFn: () => fetchCrmFieldDefinitions("SITE"),
  });

  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data ?? [];
  const site = siteQuery.data;

  if (siteQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (siteQuery.error || !site) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Site not found</AlertTitle>
        <AlertDescription>
          {siteQuery.error ? getApiErrorMessage(siteQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  const subtitle = (
    <>
      {site.client ? (
        <EntityLink href={`/crm/companies/${site.client.id}`} muted>
          {site.client.name}
        </EntityLink>
      ) : null}
      {site.client && site.city ? " · " : null}
      {site.city}
    </>
  );
  const mapsHref =
    site.latitude !== null && site.longitude !== null
      ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}`
      : null;

  return (
    <>
      <RecordPageShell
      icon={MapPin}
      backHref="/crm/sites"
      actions={[{ label: "Edit", onSelect: () => setEditOpen(true) }]}
      backLabel="All sites"
      leading={
        <RecordMark
          kind="site"
          name={site.name}
          emoji={site.emoji}
          avatarUrl={site.avatarUrl}
          size="md"
        />
      }
      title={site.name}
      reference={site.siteNo}
      subtitle={subtitle}
      activeTab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "visits",
          label: "Visits",
          count: site.appointments.length,
          content:
            site.appointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                Nobody has visited this site yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {site.appointments.map((visit) => {
                  const status = VISIT_STATUS[visit.status];
                  return (
                    <li key={visit.id} className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">{visit.appointmentNo}</span>
                        {status ? (
                          <StatusChip status={status.status} label={status.label} />
                        ) : null}
                      </div>
                      <p className="text-sm">{visit.title}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        <ClientDate value={visit.scheduledStart} />
                      </p>
                      {visit.visitItems.length > 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">
                          {visit.visitItems.length} measurement
                          {visit.visitItems.length === 1 ? "" : "s"} recorded
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ),
        },
        {
          value: "deals",
          label: "Deals",
          count: site.deals.length,
          content: (
            <RelatedList
              items={site.deals}
              emptyMessage="No deals are attached to this site yet."
              renderItem={(deal) => ({
                href: `/crm/deals/${deal.id}`,
                title: deal.title,
                subtitle: deal.stage.name,
                meta: deal.value !== null ? formatMoney(deal.value, deal.currency) : undefined,
              })}
            />
          ),
        },
        {
          value: "tasks",
          label: "Tasks",
          content: <RecordTasksTab record={{ siteId }} currentUserId={session?.user?.id} />,
        },
        {
          value: "comments",
          label: "Comments",
          content: (
            <CommentThread entity="SITE" recordId={siteId} currentUserId={session?.user?.id} />
          ),
        },
        {
          // Sites carry no activity trail of their own, so there is nothing to
          // filter history out of — the tab stays for consistency.
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={[]} />,
        },
      ]}
      rail={
        <>
          <RailSection title="Address">
            {site.addressLine ? <p className="text-sm">{site.addressLine}</p> : null}
            <p className="text-sm text-[var(--text-muted)]">
              {[site.city, site.country].filter(Boolean).join(", ") || "No address recorded"}
            </p>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm hover:underline"
              >
                Open in maps
              </a>
            ) : null}
          </RailSection>

          <RailSection title="Access">
            {site.accessInstructions ? (
              <p className="whitespace-pre-wrap text-sm">{site.accessInstructions}</p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No access notes yet.</p>
            )}
          </RailSection>

          {site.siteConditions ? (
            <RailSection title="Conditions">
              <p className="whitespace-pre-wrap text-sm">{site.siteConditions}</p>
            </RailSection>
          ) : null}

          <RailSection title="Primary contact">
            {site.primaryContact ? (
              <>
                <p className="text-sm">{site.primaryContact.fullName}</p>
                {site.primaryContact.phone ? (
                  <p className="text-sm text-[var(--text-muted)]">{site.primaryContact.phone}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Nobody named yet.</p>
            )}
          </RailSection>

          <CustomFieldDisplay definitions={definitions} values={site.customFields} />
        </>
      }
      />

      <SiteFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        // The detail record holds related objects and numeric coordinates; the
        // form holds ids and strings. Map rather than loosen the form's type.
        record={{
          id: site.id,
          emoji: site.emoji ?? "",
          avatarUrl: site.avatarUrl ?? "",
          name: site.name,
          clientId: site.client?.id ?? "",
          addressLine: site.addressLine ?? "",
          city: site.city ?? "",
          country: site.country ?? "",
          latitude: site.latitude === null ? "" : String(site.latitude),
          longitude: site.longitude === null ? "" : String(site.longitude),
          primaryContactId: site.primaryContact?.id ?? "",
          accessInstructions: site.accessInstructions ?? "",
          siteConditions: site.siteConditions ?? "",
        }}
        onSaved={() => siteQuery.refetch()}
      />
    </>
  );
}


