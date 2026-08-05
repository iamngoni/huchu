"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";
import { Building2, Globe, Mail, MapPin, Phone, UserRound } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { formatMoney } from "@/components/crm/documents/document-types";
import { RecordStory } from "@/components/crm/records/record-story";
import { buildStory } from "@/lib/crm/story";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { customFieldAttributes } from "@/components/records/custom-field-attributes";
import { CustomFieldDisplay } from "./custom-field-display";
import { RecordMark } from "@/components/records/record-mark";
import { CompanyPeopleTab } from "./company-people-tab";
import { automationTab, commentsTab, filesTab, mentionsTab, tasksTab } from "./record-tabs";
import { RecordAttributes } from "@/components/records/record-attributes";
import { useAttributeEditor } from "@/components/records/use-attribute-editor";
import { EntityLink } from "@/components/records/entity-link";
import { RailSection, RecordPageShell, RelatedList } from "@/components/records/record-page-shell";
import { CompanyFormSheet } from "./company-form-sheet";
import { RecordHistoryTab } from "./record-history-tab";
import { MergeDialog } from "./merge-dialog";
import { FieldHistoryTab } from "@/components/crm/records/field-history-tab";

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
  const edit = useAttributeEditor({
    path: `/api/v2/crm/companies/${companyId}`,
    invalidate: [["crm", "company", companyId], ["crm", "companies"]],
  });
  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: Array<{ id: string; name: string | null }> }>(
      "/api/v2/crm/team",
    ),
  });
  const ownerOptions = (teamQuery.data?.data ?? []).map((member) => ({
    value: member.id,
    label: member.name ?? "Unnamed",
  }));
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
      attributes={
        <RecordAttributes
          attributes={[
            {
              id: "owner",
              label: "Owner",
              icon: UserRound,
              placeholder: "Unassigned",
              // A choice, not a label: who owns a record is the property that
              // changes most and was the one you could not change from here.
              ...edit.choice(
                "assignedToId",
                company.assignedTo?.id ?? null,
                ownerOptions,
                "Leave unassigned",
              ),
            },
            {
              id: "phone",
              label: "Phone",
              icon: Phone,
              placeholder: "Not recorded",
              ...edit.text("phone", company.phone),
            },
            {
              id: "email",
              label: "Email",
              icon: Mail,
              placeholder: "Not recorded",
              ...edit.text("email", company.email),
            },
            {
              id: "website",
              label: "Website",
              icon: Globe,
              placeholder: "Not recorded",
              ...edit.text("website", company.website),
            },
            {
              id: "location",
              label: "Location",
              icon: MapPin,
              value: [company.city, company.country].filter(Boolean).join(", ") || null,
              placeholder: "Not recorded",
            },
            {
              id: "industry",
              label: "Industry",
              placeholder: "Not recorded",
              ...edit.text("industry", company.industry),
            },
            {
              id: "registration",
              label: "Registration no.",
              mono: true,
              placeholder: "Not recorded",
              ...edit.text("registrationNumber", company.registrationNumber),
            },
            {
              id: "tax",
              label: "Tax number",
              mono: true,
              placeholder: "Not recorded",
              ...edit.text("taxNumber", company.taxNumber),
            },
            ...customFieldAttributes({
              definitions,
              values: company.customFields,
              onCommit: (key, value) =>
                edit.save.mutate({ customFields: { [key]: value } }),
            }),
          ]}
        />
      }
      onTabChange={setTab}
      tabs={[
        {
          value: "people",
          label: "People",
          count: company.people.length,
          content: <CompanyPeopleTab companyId={companyId} people={company.people} />,
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
        tasksTab({ ref: { kind: "company", id: companyId }, currentUserId: session?.user?.id }),
        commentsTab({ ref: { kind: "company", id: companyId }, currentUserId: session?.user?.id }),
        mentionsTab({ ref: { kind: "company", id: companyId } }),
        filesTab({ ref: { kind: "company", id: companyId } }),
        automationTab({ ref: { kind: "company", id: companyId } }),
        {
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={company.activities} />,
        },
        {
          value: "changes",
          label: "Field history",
          content: <FieldHistoryTab entity="CLIENT" recordId={companyId} />,
        },
      ]}
      rail={
        <>
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
