"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmFieldDefinitions, type CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";

import { formatMoney } from "@/components/crm/documents/document-types";
import { ActivityTimeline } from "@/components/crm/lead-detail/activity-timeline";
import type { LeadActivity } from "@/components/crm/lead-detail/lead-types";

import { CustomFieldDisplay } from "./custom-field-display";
import { RailSection, RecordPageShell, RelatedList } from "./record-page-shell";
import { RecordHistoryTab } from "./record-history-tab";

const ROLE_LABELS: Record<string, string> = {
  PRIMARY: "Primary contact",
  DECISION_MAKER: "Decision-maker",
  FINANCE: "Finance",
  SITE: "Site contact",
  TECHNICAL: "Technical",
  INFLUENCER: "Influencer",
  REFERRER: "Referrer",
};

const CONTACT_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  DECISION_MAKER: "Decision-maker",
  SITE_CONTACT: "Site contact",
  FINANCE_CONTACT: "Finance contact",
  SUPPLIER_CONTACT: "Supplier",
  REFERRAL_PARTNER: "Referral partner",
  OTHER: "Other",
};

const CHANNEL_LABELS: Record<string, string> = {
  PHONE: "Phone",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  IN_PERSON: "In person",
};

type PersonDetail = {
  id: string;
  personNo: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  contactType: string;
  preferredChannel: string | null;
  customFields: Record<string, unknown> | null;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string | null } | null;
  companyLinks: Array<{
    id: string;
    jobTitle: string | null;
    isPrimary: boolean;
    client: { id: string; name: string };
  }>;
  dealContacts: Array<{
    id: string;
    role: string;
    deal: {
      id: string;
      title: string;
      value: number | null;
      currency: string;
      stage: { id: string; name: string };
    };
  }>;
  activities: LeadActivity[];
  /** Present only when this person was merged away. */
  redirectTo?: string;
};

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <dt className="w-32 shrink-0 text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-sm">
        {value ? value : <span className="text-[var(--text-muted)]">—</span>}
      </dd>
    </div>
  );
}

export function PersonDetailPage({ personId }: { personId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState("timeline");

  const personQuery = useQuery({
    queryKey: ["crm", "person", personId],
    queryFn: () => fetchJson<{ data: PersonDetail }>(`/api/v2/crm/people/${personId}`),
  });
  const fieldsQuery = useQuery({
    queryKey: ["crm", "field-definitions", "PERSON"],
    queryFn: () => fetchCrmFieldDefinitions("PERSON"),
  });

  const definitions: CrmFieldDefinitionRecord[] = fieldsQuery.data?.data.data ?? [];
  const person = personQuery.data?.data;

  if (personQuery.isLoading) {
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

  if (personQuery.error || !person) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Person not found</AlertTitle>
        <AlertDescription>
          {personQuery.error ? getApiErrorMessage(personQuery.error) : "It may have been deleted."}
        </AlertDescription>
      </Alert>
    );
  }

  // This record was merged into another one, so its old id still answers.
  // Send the reader to the survivor rather than showing a dead duplicate.
  if (person.redirectTo) {
    router.replace(`/crm/people/${person.redirectTo}`);
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

  const subtitle = [person.jobTitle, person.client?.name, person.assignedTo?.name ?? "Unassigned"]
    .filter(Boolean)
    .join(" · ");

  return (
    <RecordPageShell
      backHref="/crm/people"
      backLabel="All people"
      title={person.fullName}
      reference={person.personNo}
      subtitle={subtitle}
      activeTab={tab}
      onTabChange={setTab}
      tabs={[
        {
          value: "timeline",
          label: "Timeline",
          content: <ActivityTimeline activities={person.activities} />,
        },
        {
          value: "deals",
          label: "Deals",
          count: person.dealContacts.length,
          content: (
            <RelatedList
              items={person.dealContacts}
              emptyMessage="This person isn't on any deals yet."
              renderItem={(contact) => ({
                href: `/crm/deals/${contact.deal.id}`,
                title: contact.deal.title,
                subtitle:
                  [ROLE_LABELS[contact.role] ?? contact.role, contact.deal.stage.name]
                    .filter(Boolean)
                    .join(" · ") || null,
                meta:
                  contact.deal.value !== null
                    ? formatMoney(contact.deal.value, contact.deal.currency)
                    : undefined,
              })}
            />
          ),
        },
        {
          value: "history",
          label: "History",
          content: <RecordHistoryTab activities={person.activities} />,
        },
      ]}
      rail={
        <>
          <RailSection title="Contact">
            <dl className="divide-y divide-[var(--border)]">
              <DetailRow label="Email" value={person.email} />
              <DetailRow label="Phone" value={person.phone} />
              <DetailRow
                label="Prefers"
                value={
                  person.preferredChannel
                    ? CHANNEL_LABELS[person.preferredChannel] ?? person.preferredChannel
                    : null
                }
              />
              <DetailRow
                label="Contact type"
                value={CONTACT_TYPE_LABELS[person.contactType] ?? person.contactType}
              />
            </dl>
          </RailSection>

          <RailSection title="Company">
            {person.client ? (
              <Link href={`/crm/companies/${person.client.id}`} className="text-sm hover:underline">
                {person.client.name}
              </Link>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No company</p>
            )}
          </RailSection>

          {person.companyLinks.length > 1 ? (
            <RailSection title="Companies">
              <ul className="space-y-1.5">
                {person.companyLinks.map((link) => (
                  <li key={link.id} className="text-sm">
                    <Link href={`/crm/companies/${link.client.id}`} className="hover:underline">
                      {link.client.name}
                    </Link>
                    {link.jobTitle ? (
                      <span className="text-xs text-[var(--text-muted)]"> · {link.jobTitle}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </RailSection>
          ) : null}

          <CustomFieldDisplay definitions={definitions} values={person.customFields} />
        </>
      }
    />
  );
}
