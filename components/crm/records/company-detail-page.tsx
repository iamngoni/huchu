"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";
import { Building2 } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { formatMoney } from "@/components/crm/documents/document-types";
import { CommentThread } from "@/components/crm/collaboration/comment-thread";
import { RecordTasksTab } from "@/components/crm/tasks/record-tasks-tab";
import { RecordStory } from "@/components/crm/records/record-story";
import { buildStory } from "@/lib/crm/story";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "./record-mark";
import { EntityLink } from "./entity-link";
import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { CompanyFormSheet } from "./company-form-sheet";
import { RecordHistoryTab } from "./record-history-tab";
import { MergeDialog } from "./merge-dialog";

const ACCOUNT_STATUS_PRESENTATION: Record<string, { label: string; status: CanonicalUiStatus }> = {
  ACTIVE: { label: "Active", status: "passing" },
  ON_HOLD: { label: "On hold", status: "pending" },
  INACTIVE: { label: "Inactive", status: "inactive" },
  BLACKLISTED: { label: "Blacklisted", status: "failing" },
};

const RELATION_LABELS: Record<string, string> = {
  HEAD_OFFICE: "Head office",
  BRANCH: "Branch",
  SUBSIDIARY: "Subsidiary",
  DEPARTMENT: "Department",
};

type CompanyDetail = {
  id: string;
  avatarUrl: string | null;
  emoji: string | null;
  clientNo: string;
  name: string;
  tradingName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  website: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  addressLine: string | null;
  billingAddress: string | null;
  companyType: string;
  accountStatus: string;
  notes: string | null;
  parentRelation: string | null;
  customFields: Record<string, unknown> | null;
  assignedTo: { id: string; name: string | null } | null;
  parent: { id: string; name: string } | null;
  children: Array<{ id: string; name: string; parentRelation: string | null }>;
  people: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    phone: string | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    status: "OPEN" | "WON" | "LOST";
    value: number | null;
    currency: string;
    stage: { id: string; name: string };
  }>;
  sites: Array<{ id: string; name: string; addressLine: string | null; city: string | null }>;
  activities: LeadActivity[];
  /** Present only when this company was merged away. */
  redirectTo?: string;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <dt className="w-32 shrink-0 text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right text-sm">{children}</dd>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string | null }) {
  return (
    <DetailRow label={label}>
      {value ? value : <span className="text-[var(--text-muted)]">—</span>}
    </DetailRow>
  );
}

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("people");

  const companyQuery = useQuery({
    queryKey: ["crm", "company", companyId],
    queryFn: () => fetchJson<CompanyDetail>(`/api/v2/crm/companies/${companyId}`),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "COMPANY"],
    queryFn: () => fetchCrmFieldDefinitions("COMPANY"),
  });

  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data ?? [];
  const company = companyQuery.data;

  if (companyQuery.isLoading) {
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

  if (companyQuery.error || !company) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Company not found</AlertTitle>
        <AlertDescription>
          {companyQuery.error ? getApiErrorMessage(companyQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  // This record was merged into another one, so its old id still answers.
  // Send the reader to the survivor rather than showing a dead duplicate.
  if (company.redirectTo) {
    router.replace(`/crm/companies/${company.redirectTo}`);
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

  const subtitle = (
    <>
      {[company.tradingName, company.city].filter(Boolean).join(" · ")}
      {company.tradingName || company.city ? " · " : null}
      <EntityLink
        href={company.assignedTo ? `/crm/reps/${company.assignedTo.id}` : null}
        muted
      >
        {company.assignedTo?.name ?? "Unassigned"}
      </EntityLink>
    </>
  );

  const wonValue = company.deals
    .filter((deal) => deal.status === "WON")
    .reduce((sum, deal) => sum + (deal.value ?? 0), 0);
  const openDeals = company.deals.filter((deal) => deal.status === "OPEN");
  // Deals may in principle be priced in different currencies; the rail reports
  // in whichever one this company's deals are actually written in.
  const currency = company.deals[0]?.currency ?? "USD";

  const hasHierarchy = Boolean(company.parent) || company.children.length > 0;

  return (
    <>
    <RecordPageShell
      icon={Building2}
      backHref="/crm/companies"
      backLabel="All companies"
      actions={[
        { label: "Edit", onSelect: () => setEditOpen(true) },
        { label: "Merge a duplicate", onSelect: () => setMergeOpen(true) },
      ]}
      leading={
        <RecordMark
          kind="company"
          name={company.name}
          emoji={company.emoji}
          avatarUrl={company.avatarUrl}
          size="md"
        />
      }
      title={company.name}
      reference={company.clientNo}
      status={ACCOUNT_STATUS_PRESENTATION[company.accountStatus] ?? null}
      subtitle={subtitle}
      activeTab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "people",
          label: "People",
          count: company.people.length,
          content: (
            <RelatedList
              items={company.people}
              emptyMessage="Nobody is recorded at this company yet."
              renderItem={(person) => ({
                href: `/crm/people/${person.id}`,
                title: person.fullName,
                subtitle: person.jobTitle,
                meta: person.phone ?? undefined,
              })}
            />
          ),
        },
        {
          value: "deals",
          label: "Deals",
          count: company.deals.length,
          content: (
            <RelatedList
              items={company.deals}
              emptyMessage="No deals with this company yet."
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
          value: "sites",
          label: "Sites",
          count: company.sites.length,
          content: (
            <RelatedList
              items={company.sites}
              emptyMessage="No sites recorded for this company yet."
              renderItem={(site) => ({
                href: `/crm/sites/${site.id}`,
                title: site.name,
                subtitle: [site.addressLine, site.city].filter(Boolean).join(", ") || null,
              })}
            />
          ),
        },
        {
          value: "timeline",
          label: "Timeline",
          content: (
            <RecordStory
              events={buildStory({
                activities: company.activities,
                createdLabel: "Company added",
              })}
            />
          ),
        },
        {
          value: "tasks",
          label: "Tasks",
          content: (
            <RecordTasksTab record={{ clientId: companyId }} currentUserId={session?.user?.id} />
          ),
        },
        {
          value: "comments",
          label: "Comments",
          content: (
            <CommentThread
              entity="COMPANY"
              recordId={companyId}
              currentUserId={session?.user?.id}
            />
          ),
        },
        {
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={company.activities} />,
        },
      ]}
      rail={
        <>
          <RailSection title="Details">
            <dl className="divide-y divide-[var(--border)]">
              <TextRow label="Registration no." value={company.registrationNumber} />
              <TextRow label="Tax number" value={company.taxNumber} />
              <TextRow label="Industry" value={company.industry} />
              <DetailRow label="Website">
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </DetailRow>
              <TextRow label="Phone" value={company.phone} />
              <TextRow label="Email" value={company.email} />
            </dl>
          </RailSection>

          {hasHierarchy ? (
            <RailSection title="Hierarchy">
              {company.parent ? (
                <p className="text-sm">
                  <EntityLink href={`/crm/companies/${company.parent.id}`}>
                    {company.parent.name}
                  </EntityLink>
                  {company.parentRelation ? (
                    <span className="text-sm text-[var(--text-muted)]">
                      {" · "}
                      {RELATION_LABELS[company.parentRelation] ?? company.parentRelation}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {company.children.length > 0 ? (
                <ul className={company.parent ? "mt-2 space-y-1.5" : "space-y-1.5"}>
                  {company.children.map((child) => (
                    <li key={child.id} className="text-sm">
                      <EntityLink href={`/crm/companies/${child.id}`}>
                        {child.name}
                      </EntityLink>
                      {child.parentRelation ? (
                        <span className="text-sm text-[var(--text-muted)]">
                          {" · "}
                          {RELATION_LABELS[child.parentRelation] ?? child.parentRelation}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </RailSection>
          ) : null}

          <RailSection title="Value">
            <p className="font-mono text-2xl">{formatMoney(wonValue, currency)}</p>
            <p className="text-sm text-[var(--text-muted)]">
              won so far · {openDeals.length} deal{openDeals.length === 1 ? "" : "s"} still open
            </p>
          </RailSection>

          <CustomFieldDisplay definitions={definitions} values={company.customFields} />
        </>
      }
    />

    <CompanyFormSheet
      open={editOpen}
      onOpenChange={setEditOpen}
      record={{
        id: company.id,
        emoji: company.emoji ?? "",
        avatarUrl: company.avatarUrl ?? "",
        name: company.name,
        tradingName: company.tradingName ?? "",
        companyType: company.companyType,
        registrationNumber: company.registrationNumber ?? "",
        taxNumber: company.taxNumber ?? "",
        website: company.website ?? "",
        industry: company.industry ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        addressLine: company.addressLine ?? "",
        city: company.city ?? "",
        country: company.country ?? "",
        billingAddress: company.billingAddress ?? "",
        accountStatus: company.accountStatus,
        parentClientId: company.parent?.id ?? "",
        parentRelation: company.parentRelation ?? "",
        notes: company.notes ?? "",
        assignedToId: company.assignedTo?.id ?? "",
      }}
      onSaved={() => companyQuery.refetch()}
    />

    <MergeDialog
      entity="COMPANY"
      survivorId={companyId}
      survivorLabel={company.name}
      open={mergeOpen}
      onOpenChange={setMergeOpen}
    />
    </>
  );
}
